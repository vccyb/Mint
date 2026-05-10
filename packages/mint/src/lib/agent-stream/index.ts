export { SessionStreamState } from './session-context';
export { parseToolResult, extractTaskDescription, buildSkillIndexPrompt, isSkillRead } from './skill-utils';
export { handleStreamEvent } from './content-handler';
export { handleSystemMessage } from './teammate-handler';
export { handleUserMessage } from './tool-result-handler';
export { handleResultMessage } from './result-handler';

import type { SessionStreamState } from './session-context';
import { handleStreamEvent } from './content-handler';
import { handleSystemMessage } from './teammate-handler';
import { handleUserMessage } from './tool-result-handler';
import { handleResultMessage } from './result-handler';

/**
 * Process a single SDK message from the `query()` async iterator.
 * Routes to the appropriate handler based on `sdkMessage.type`.
 */
export function processSDKMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdkMessage: any,
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
): void {
  if (sdkMessage.type === 'stream_event') {
    handleStreamEvent(sdkMessage.event, state, enqueue);
  } else if (sdkMessage.type === 'system') {
    handleSystemMessage(sdkMessage, state, enqueue);
  } else if (sdkMessage.type === 'user') {
    handleUserMessage(sdkMessage, state, enqueue);
  } else if (sdkMessage.type === 'result') {
    handleResultMessage(sdkMessage, state, enqueue);
  }
}
