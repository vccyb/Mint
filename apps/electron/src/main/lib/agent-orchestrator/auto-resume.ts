import { encodeSSE } from '../sse';
import { createLogger } from '../logger';
import { generateId } from '../utils';
import { SessionStreamState } from '../agent-stream';
import type { AgentAdapter } from '../agent-adapter';
import {
  findTeamLeadInboxPath,
  pollInboxWithRetry,
  markInboxAsRead,
  formatInboxPrompt,
  formatSummaryFallbackPrompt,
} from '../team-inbox-reader';
import type { ChatMessage, StreamEventData } from '../../../types';

const log = createLogger('lib.agent-orchestrator.auto-resume');

export interface AutoResumeParams {
  sessionId: string;
  isPlanMode: boolean;
  storage: {
    appendMessage: (sessionId: string, message: ChatMessage) => Promise<void>;
    readSession: (sessionId: string) => Promise<{ messages: ChatMessage[] }>;
    updateSessionMetadata: (sessionId: string, meta: Record<string, unknown>) => Promise<void>;
  };
}

/** Auto-resume: collect worker results from inbox and resume session. */
export async function autoResume(
  state: SessionStreamState,
  queryOptions: any,
  adapter: AgentAdapter,
  params: AutoResumeParams,
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
      log.info('Resuming session with worker results', {
        source: inboxInfo ? 'inbox' : 'summaries',
      });

      const waitingEvent: StreamEventData = { type: 'team_waiting_resume', data: '', sessionId };
      enqueue(enc.encode(encodeSSE(waitingEvent)));

      const resumeResult = adapter.resumeQuery(
        resumePrompt,
        state.capturedSdkSessionId!,
        queryOptions,
      );
      let resumeContent = '';

      for await (const resumeMsg of resumeResult) {
        if (resumeMsg.type === 'stream_event') {
          const event = resumeMsg.event as {
            type: string;
            delta?: { type: string; text?: string; thinking?: string };
          };
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const text = event.delta.text ?? '';
            resumeContent += text;
            state.assistantContent += text;
            enqueue(enc.encode(encodeSSE({ type: 'content', data: text, sessionId })));
          }
          if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
            const text = event.delta.thinking ?? '';
            state.thinkingContent += text;
            enqueue(
              enc.encode(
                encodeSSE({ type: 'thinking', data: '', sessionId, thinkingDelta: text }),
              ),
            );
          }
        } else if (resumeMsg.type === 'result') {
          break;
        }
      }

      if (resumeContent) {
        const resumeMsgRecord: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: resumeContent,
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
