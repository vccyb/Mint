import { encodeSSE } from '@/lib/sse';
import { createLogger } from '@/lib/logger';
import { classifyError } from '@/lib/classify-error';
import { generateId } from '@/lib/utils';
import { SessionStreamState, processSDKMessage } from '@/lib/agent-stream';
import { AgentAdapter } from '@/lib/agent-adapter';
import {
  findTeamLeadInboxPath,
  pollInboxWithRetry,
  markInboxAsRead,
  formatInboxPrompt,
  formatSummaryFallbackPrompt,
  areAllWorkersIdle,
} from '@/lib/team-inbox-reader';
import { MAX_ATTACHMENT_SIZE, MAX_AUTO_RETRIES, RETRY_BASE_MS, GLOBAL_TIMEOUT_MS } from '@/lib/constants';
import type { ChatMessage, StreamEventData, TeammateState, Attachment } from '@/types';

const log = createLogger('lib.agent-orchestrator');

/** Create a timer Promise that can be aborted. */
function timerWithAbort(ms: number, signal: AbortSignal): Promise<'timeout' | 'aborted'> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve('aborted'); return; }
    const timer = setTimeout(() => resolve('timeout'), ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve('aborted'); }, { once: true });
  });
}

/** Emit teammate_completed(stopped) for every task still in startedTaskIds. */
function finalizeTeammates(state: SessionStreamState, enqueue: (data: Uint8Array) => boolean): void {
  const enc = new TextEncoder();
  for (const taskId of state.startedTaskIds) {
    const idx = state.teammateIndexMap.get(taskId);
    if (idx === undefined) continue;
    const teammate: TeammateState = {
      taskId,
      description: state.teammateDescriptions.get(taskId) ?? '',
      index: idx,
      status: 'stopped',
      toolHistory: [...(state.teammateToolHistories.get(taskId) ?? [])],
      startedAt: state.teammateStartTimes.get(taskId) ?? Date.now(),
      endedAt: Date.now(),
    };
    const event: StreamEventData = { type: 'teammate_completed', data: '', sessionId: state.sessionId, teammate };
    enqueue(enc.encode(encodeSSE(event)));
  }
  state.startedTaskIds.clear();
}

export interface RunSessionParams {
  sessionId: string;
  prompt: string;
  historyMessages: string;
  attachments?: Attachment[];
  isPlanMode: boolean;
  isNewSession: boolean;
  adapter: AgentAdapter;
  enqueue: (data: Uint8Array) => boolean;
  storage: {
    appendMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
    readSession: (sessionId: string) => Promise<{ messages: ChatMessage[] }>;
    updateSessionMetadata: (sessionId: string, meta: Record<string, unknown>) => Promise<void>;
  };
  skillPathMap: Map<string, { name: string; description: string }>;
  skillsEnabled: boolean;
  /** HTTP request signal — propagated from client disconnect */
  abortSignal?: AbortSignal;
}

/**
 * Core agent orchestrator with concurrency guard, auto-retry, result deferral,
 * watchdog, and auto-resume.
 *
 * Inspired by Proma's AgentOrchestrator, adapted for Mint's SSE transport.
 */
export class AgentOrchestrator {
  private activeSessions = new Set<string>();

  async runSession(params: RunSessionParams): Promise<void> {
    const { sessionId, adapter, enqueue } = params;

    // Concurrency guard — has() + add() MUST remain synchronous (no await between them).
    // This guarantees atomicity in Node.js's single-threaded event loop.
    if (this.activeSessions.has(sessionId)) {
      log.warn('Session already active, rejecting', { sessionId });
      const enc = new TextEncoder();
      const errEvent: StreamEventData = {
        type: 'error', data: 'Session is already running',
        sessionId, errorCode: 'INTERNAL_ERROR',
      };
      enqueue(enc.encode(encodeSSE(errEvent)));
      return;
    }
    this.activeSessions.add(sessionId);

    // Global timeout — ensures the client always receives a result/error event
    // even if the SDK stream hangs or a teammate process never completes.
    const globalAbort = new AbortController();
    const timeoutId = setTimeout(() => {
      log.warn('Global session timeout reached, aborting', { sessionId });
      globalAbort.abort();
    }, GLOBAL_TIMEOUT_MS);

    // Propagate client disconnect (HTTP request abort) to global abort + adapter
    if (params.abortSignal) {
      if (params.abortSignal.aborted) {
        globalAbort.abort();
        adapter.abort();
      } else {
        params.abortSignal.addEventListener('abort', () => {
          log.info('Client disconnected, aborting session', { sessionId });
          globalAbort.abort();
          adapter.abort();
        }, { once: true });
      }
    }

    try {
      await this.runWithRetry(params, globalAbort.signal);
    } finally {
      clearTimeout(timeoutId);
      globalAbort.abort();
      this.activeSessions.delete(sessionId);
    }
  }

  private async runWithRetry(params: RunSessionParams, timeoutSignal: AbortSignal): Promise<void> {
    const { sessionId, adapter, enqueue, isPlanMode } = params;
    const enc = new TextEncoder();

    const state = new SessionStreamState({
      sessionId,
      isPlanMode,
      log,
      skillPathMap: params.skillPathMap,
      skillsEnabled: params.skillsEnabled,
    });

    // Send initial session event
    const initEvent: StreamEventData = { type: 'content', data: '', sessionId, isPlanMode };
    enqueue(enc.encode(encodeSSE(initEvent)));

    try {
      const queryOptions = adapter.buildQueryOptions(sessionId, enqueue);
      const fullPrompt = this.buildPrompt(params);

      // Run SDK query with retry
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
        if (timeoutSignal.aborted) {
          throw new Error('Session timed out');
        }
        try {
          await this.iterateSDKMessages(adapter, fullPrompt, queryOptions, state, enqueue, timeoutSignal);
          lastError = null;
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (timeoutSignal.aborted) throw new Error('Session timed out');
          const isRetryable = this.isRetryableError(lastError);
          if (!isRetryable || attempt === MAX_AUTO_RETRIES) throw lastError;

          // Use resume if we already have an SDK session ID
          const resumeId = state.capturedSdkSessionId;
          if (resumeId) {
            log.info('Retrying with resume (session already started)', { attempt: attempt + 1, sdkSessionId: resumeId });
            try {
              await this.iterateSDKMessagesResume(adapter, fullPrompt, resumeId, queryOptions, state, enqueue, timeoutSignal);
              lastError = null;
              break;
            } catch (resumeErr) {
              lastError = resumeErr instanceof Error ? resumeErr : new Error(String(resumeErr));
              if (timeoutSignal.aborted) throw new Error('Session timed out');
              if (!this.isRetryableError(lastError)) throw lastError;
              log.warn('Resume retry failed, will try full query', { error: lastError.message });
            }
          }

          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          log.info('Retrying SDK query', { attempt: attempt + 1, delayMs: delay });
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      // Finalize remaining teammates
      if (state.startedTaskIds.size > 0) {
        finalizeTeammates(state, enqueue);
      }

      // Save assistant message
      await this.saveAssistantMessage(state, params);

      // Auto-resume if needed
      await this.autoResume(state, queryOptions, adapter, params, enqueue);

      // Send result event
      log.info('Agent stream completed', {
        contentLength: state.assistantContent.length,
        toolCallCount: state.toolCalls.length,
      });
      const resultEvent: StreamEventData = {
        type: 'result',
        data: JSON.stringify({ role: 'assistant', content: state.assistantContent }),
        sessionId,
        isPlanMode: isPlanMode || undefined,
      };
      enqueue(enc.encode(encodeSSE(resultEvent)));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Agent error';
      log.error('Agent stream error', { error: errMsg });

      if (state.startedTaskIds.size > 0) {
        finalizeTeammates(state, enqueue);
      }

      const classified = classifyError(errMsg);
      const errorEvent: StreamEventData = {
        type: 'error', data: classified.userMessage,
        sessionId, errorCode: classified.code,
      };
      enqueue(enc.encode(encodeSSE(errorEvent)));
    }
  }

  /** Iterate SDK messages with watchdog and global timeout. */
  private async iterateSDKMessages(
    adapter: AgentAdapter,
    prompt: string,
    queryOptions: Parameters<typeof import('@anthropic-ai/claude-agent-sdk').query>[0]['options'],
    state: SessionStreamState,
    enqueue: (data: Uint8Array) => boolean,
    timeoutSignal: AbortSignal,
  ): Promise<void> {
    const result = adapter.executeQuery(prompt, queryOptions);
    await this.consumeSDKIterator(result, state, enqueue, timeoutSignal);
  }

  /** Iterate SDK messages using resume (for retry when session already started). */
  private async iterateSDKMessagesResume(
    adapter: AgentAdapter,
    prompt: string,
    sdkSessionId: string,
    queryOptions: Parameters<typeof import('@anthropic-ai/claude-agent-sdk').query>[0]['options'],
    state: SessionStreamState,
    enqueue: (data: Uint8Array) => boolean,
    timeoutSignal: AbortSignal,
  ): Promise<void> {
    const resumePrompt = 'The previous connection was interrupted. Please continue from where you left off.';
    const result = adapter.resumeQuery(resumePrompt, sdkSessionId, queryOptions);
    await this.consumeSDKIterator(result, state, enqueue, timeoutSignal);
  }

  /** Shared iterator consumption with watchdog and global timeout. */
  private async consumeSDKIterator(
    result: AsyncIterable<any>,
    state: SessionStreamState,
    enqueue: (data: Uint8Array) => boolean,
    timeoutSignal: AbortSignal,
  ): Promise<void> {
    const loopAbort = new AbortController();

    // Propagate global timeout to loop abort
    if (timeoutSignal.aborted) {
      loopAbort.abort();
    } else {
      timeoutSignal.addEventListener('abort', () => {
        log.warn('Global timeout propagated to SDK iterator');
        loopAbort.abort();
      }, { once: true });
    }

    // Watchdog: every 5s check if all workers are idle
    const watchdogDone = (async () => {
      while (!loopAbort.signal.aborted) {
        const status = await timerWithAbort(5000, loopAbort.signal);
        if (status === 'aborted') break;
        if (state.startedTaskIds.size > 0 && state.capturedSdkSessionId) {
          const allIdle = areAllWorkersIdle(state.capturedSdkSessionId, state.startedTaskIds.size);
          if (allIdle) {
            log.info('Watchdog: all workers idle, aborting main loop');
            loopAbort.abort();
          }
        }
      }
    })();

    const abortPromise = new Promise<'aborted'>((resolve) => {
      if (loopAbort.signal.aborted) { resolve('aborted'); return; }
      loopAbort.signal.addEventListener('abort', () => resolve('aborted'), { once: true });
    });

    const iterator = result[Symbol.asyncIterator]();
    let lastMessageTime = Date.now();
    const getStallMs = () => state.startedTaskIds.size > 0 ? 120_000 : 30_000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const stallPromise = new Promise<'stalled'>((resolve) => {
        const check = () => {
          if (loopAbort.signal.aborted) return;
          const elapsed = Date.now() - lastMessageTime;
          if (elapsed > getStallMs()) { resolve('stalled'); return; }
          setTimeout(check, 5000);
        };
        setTimeout(check, 5000);
      });

      const raceResult = await Promise.race([iterator.next(), abortPromise, stallPromise]);
      if (raceResult === 'aborted' || raceResult === 'stalled') {
        if (raceResult === 'stalled') {
          log.warn('SDK iterator stalled for 30s, aborting to trigger auto-resume');
        }
        break;
      }
      if ((raceResult as IteratorResult<any>).done) break;
      processSDKMessage((raceResult as IteratorResult<any>).value, state, enqueue);
      lastMessageTime = Date.now();
    }

    loopAbort.abort();
    await watchdogDone;
  }

  /** Auto-resume: collect worker results from inbox and resume session. */
  private async autoResume(
    state: SessionStreamState,
    queryOptions: any,
    adapter: AgentAdapter,
    params: RunSessionParams,
    enqueue: (data: Uint8Array) => boolean,
  ): Promise<void> {
    const { sessionId } = params;
    const enc = new TextEncoder();
    const shouldResume = state.teammateIndexMap.size > 0 && state.capturedSdkSessionId;
    if (!shouldResume) return;

    try {
      log.info('Starting auto-resume flow', { sdkSessionId: state.capturedSdkSessionId });

      let resumePrompt: string | null = null;
      const inboxInfo = await findTeamLeadInboxPath(state.capturedSdkSessionId!);

      if (inboxInfo) {
        const unreadMessages = await pollInboxWithRetry(inboxInfo.inboxPath);
        if (unreadMessages.length > 0) {
          markInboxAsRead(inboxInfo.inboxPath);
          resumePrompt = formatInboxPrompt(unreadMessages);
        }
      }

      if (!resumePrompt && state.taskNotificationSummaries.length > 0) {
        resumePrompt = formatSummaryFallbackPrompt(state.taskNotificationSummaries);
      }

      if (resumePrompt) {
        log.info('Resuming session with worker results', { source: inboxInfo ? 'inbox' : 'summaries' });

        const waitingEvent: StreamEventData = { type: 'team_waiting_resume', data: '', sessionId };
        enqueue(enc.encode(encodeSSE(waitingEvent)));

        const resumeResult = adapter.resumeQuery(resumePrompt, state.capturedSdkSessionId!, queryOptions);
        let resumeContent = '';

        for await (const resumeMsg of resumeResult) {
          if (resumeMsg.type === 'stream_event') {
            const event = resumeMsg.event as { type: string; delta?: { type: string; text?: string; thinking?: string } };
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text ?? '';
              resumeContent += text;
              state.assistantContent += text;
              enqueue(enc.encode(encodeSSE({ type: 'content', data: text, sessionId })));
            }
            if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
              const text = event.delta.thinking ?? '';
              state.thinkingContent += text;
              enqueue(enc.encode(encodeSSE({ type: 'thinking', data: '', sessionId, thinkingDelta: text })));
            }
          } else if (resumeMsg.type === 'result') {
            break;
          }
        }

        if (resumeContent) {
          const resumeMsgRecord: ChatMessage = {
            id: generateId(), role: 'assistant', content: resumeContent,
            timestamp: Date.now(),
            thinkingContent: state.thinkingContent || undefined,
            isPlanMode: params.isPlanMode || undefined,
          };
          await params.storage.appendMessage(sessionId, resumeMsgRecord);
        }
      } else {
        log.info('No resume prompt available, skipping auto-resume');
      }
    } catch (resumeError) {
      log.error('Auto-resume failed', {
        error: resumeError instanceof Error ? resumeError.message : 'Unknown',
      });
    }
  }

  /** Build the full prompt with history and attachments. */
  private buildPrompt(params: RunSessionParams): string {
    let prompt = params.prompt;
    if (params.historyMessages) {
      prompt = `[Previous conversation]\n${params.historyMessages}\n[End of previous conversation]\n\nUser: ${params.prompt}`;
    }
    if (params.attachments && params.attachments.length > 0) {
      const parts = params.attachments
        .filter((a) => a.content && a.size <= MAX_ATTACHMENT_SIZE)
        .map((a) =>
          a.type.startsWith('image/')
            ? `[Image: ${a.name}]`
            : `[File: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``,
        );
      if (parts.length > 0) {
        prompt = parts.join('\n\n') + '\n\n' + prompt;
      }
    }
    return prompt;
  }

  /** Save the assistant message to storage. */
  private async saveAssistantMessage(state: SessionStreamState, params: RunSessionParams): Promise<void> {
    if (!state.assistantContent && state.toolCalls.length === 0 && !state.thinkingContent) return;

    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: state.assistantContent,
      timestamp: Date.now(),
      toolCalls: state.toolCalls.length > 0 ? state.toolCalls : undefined,
      skillLoads: state.skillLoads.length > 0 ? state.skillLoads : undefined,
      todos: state.latestTodos.length > 0
        ? state.latestTodos.map(t => t.status === 'in_progress' ? { ...t, status: 'completed' as const } : t)
        : undefined,
      thinkingContent: state.thinkingContent || undefined,
      isPlanMode: params.isPlanMode || undefined,
    };
    await params.storage.appendMessage(params.sessionId, assistantMsg);

    if (params.isNewSession) {
      await params.storage.updateSessionMetadata(params.sessionId, { messageCount: 2 });
    } else {
      const sess = await params.storage.readSession(params.sessionId);
      await params.storage.updateSessionMetadata(params.sessionId, { messageCount: sess.messages.length });
    }
  }

  /** Check if an error is worth retrying. */
  private isRetryableError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return msg.includes('rate') || msg.includes('timeout') || msg.includes('network') || msg.includes('429') || msg.includes('503');
  }
}
