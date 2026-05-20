import { encodeSSE } from '../sse';
import { classifyError } from '../classify-error';
import type { StreamEventData } from '../../../types';
import type { SessionStreamState } from './session-context';

/**
 * Handle SDK result messages: session ID capture, usage/contextWindow extraction,
 * error classification, and result deferral when teammates are still active.
 */
export function handleResultMessage(
  resultMsg: any,
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
): void {
  const sid = state.sessionId;
  const enc = new TextEncoder();

  // Capture SDK session ID for auto-resume
  if (resultMsg.session_id) {
    state.capturedSdkSessionId = state.capturedSdkSessionId ?? resultMsg.session_id;
  }

  // Extract contextWindow from modelUsage
  if (resultMsg.modelUsage) {
    const modelUsageValues = Object.values(resultMsg.modelUsage) as Array<{
      contextWindow?: number;
    }>;
    const contextWindow = modelUsageValues[0]?.contextWindow;
    if (contextWindow) {
      const usageEvent: StreamEventData = {
        type: 'usage_update',
        data: '',
        sessionId: sid,
        inputTokens: resultMsg.usage?.input_tokens ?? 0,
        contextWindow,
      };
      enqueue(enc.encode(encodeSSE(usageEvent)));
    }
  }

  const hasCompletedTeammates =
    state.teammateIndexMap.size > 0 && state.taskNotificationSummaries.length > 0;

  // Only emit error if there are no completed teammates
  if ((resultMsg.subtype === 'error' || resultMsg.is_error) && !hasCompletedTeammates) {
    const rawError = resultMsg.result ?? 'Agent error';
    const classified = classifyError(rawError);
    const errorEvent: StreamEventData = {
      type: 'error',
      data: classified.userMessage,
      sessionId: sid,
      errorCode: classified.code,
    };
    enqueue(enc.encode(encodeSSE(errorEvent)));
  } else if (resultMsg.subtype === 'error' || resultMsg.is_error) {
    state.log.info('SDK result has error but teammates completed — treating as success', {
      error: resultMsg.result?.slice(0, 200),
      teammateCount: state.teammateIndexMap.size,
    });
  }

  // Defer result if teammates are still active
  if (state.startedTaskIds.size > 0) {
    state.log.info('Deferring result message', { activeTeammates: state.startedTaskIds.size });
    state.deferredResultMessage = resultMsg;
  }
}
