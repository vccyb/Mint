import { encodeSSE } from '@/lib/sse';
import { createLogger } from '@/lib/logger';
import { classifyError } from '@/lib/classify-error';
import { SessionStreamState } from '@/lib/agent-stream';
import { AgentAdapter } from '@/lib/agent-adapter';
import { GLOBAL_TIMEOUT_MS, MAX_AUTO_RETRIES, RETRY_BASE_MS } from '@/lib/constants';
import { iterateSDKMessages, iterateSDKMessagesResume } from './consume-iterator';
import { autoResume } from './auto-resume';
import type { AutoResumeParams } from './auto-resume';
import { buildPrompt, saveAssistantMessage } from './session-helpers';
import type { StreamEventData, TeammateState, Attachment, ChatMessage, SessionFile } from '@/types';

const log = createLogger('lib.agent-orchestrator');

/** Emit teammate_completed(stopped) for every task still in startedTaskIds. */
function finalizeTeammates(
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
): void {
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
    const event: StreamEventData = {
      type: 'teammate_completed',
      data: '',
      sessionId: state.sessionId,
      teammate,
    };
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
  /** Session-level files available as persistent context */
  sessionFiles?: SessionFile[];
  /** Session file contents keyed by file ID */
  sessionFileContents?: Map<string, string>;
  /** Image file paths saved to disk (name -> absolute path) for agent Read tool */
  savedFilePaths?: Map<string, string>;
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
        type: 'error',
        data: 'Session is already running',
        sessionId,
        errorCode: 'INTERNAL_ERROR',
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
        params.abortSignal.addEventListener(
          'abort',
          () => {
            log.info('Client disconnected, aborting session', { sessionId });
            globalAbort.abort();
            adapter.abort();
          },
          { once: true },
        );
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
      const fullPrompt = await buildPrompt(params);

      // Run SDK query with retry
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
        if (timeoutSignal.aborted) {
          throw new Error('Session timed out');
        }
        try {
          await iterateSDKMessages(
            adapter,
            fullPrompt,
            queryOptions,
            state,
            enqueue,
            timeoutSignal,
          );
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
            log.info('Retrying with resume (session already started)', {
              attempt: attempt + 1,
              sdkSessionId: resumeId,
            });
            try {
              await iterateSDKMessagesResume(
                adapter,
                fullPrompt,
                resumeId,
                queryOptions,
                state,
                enqueue,
                timeoutSignal,
              );
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
      await saveAssistantMessage(state, params);

      // Auto-resume if needed
      const autoResumeParams: AutoResumeParams = {
        sessionId: params.sessionId,
        isPlanMode: params.isPlanMode,
        storage: params.storage,
      };
      await autoResume(state, queryOptions, adapter, autoResumeParams, enqueue);

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
        type: 'error',
        data: classified.userMessage,
        sessionId,
        errorCode: classified.code,
      };
      enqueue(enc.encode(encodeSSE(errorEvent)));
    }
  }

  /** Check if an error is worth retrying. */
  private isRetryableError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('rate') ||
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('429') ||
      msg.includes('503')
    );
  }
}
