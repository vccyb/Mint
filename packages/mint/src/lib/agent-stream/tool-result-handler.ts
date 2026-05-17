import { encodeSSE } from '@/lib/sse';
import type { StreamEventData, TeammateState } from '@/types';
import { parseToolResult } from './skill-utils';
import type { SessionStreamState } from './session-context';

/**
 * Handle SDK user messages: tool_result blocks.
 * Detects teammate completion via Task/Agent tool results.
 */
export function handleUserMessage(
  msg: any,
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
): void {
  const sid = state.sessionId;
  const enc = new TextEncoder();

  if (!msg.message?.content) return;

  for (const block of msg.message.content) {
    if (block.type === 'tool_result' && block.tool_use_id) {
      // Silently skip TodoWrite tool results
      if (state.todoWriteToolIds.has(block.tool_use_id)) {
        state.todoWriteToolIds.delete(block.tool_use_id);
        continue;
      }

      const resultStr =
        typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
      const isErr = block.is_error ?? false;

      // Handle Task/Agent tool results
      if (state.taskToolIds.has(block.tool_use_id)) {
        state.taskToolIds.delete(block.tool_use_id);
        const stillActive = state.startedTaskIds.has(block.tool_use_id);
        state.startedTaskIds.delete(block.tool_use_id);

        const mappedTaskId = state.pendingTaskToTaskId.get(block.tool_use_id) ?? block.tool_use_id;
        const existingIdx =
          state.teammateIndexMap.get(mappedTaskId) ?? state.teammateIndexMap.get(block.tool_use_id);

        if (existingIdx !== undefined) {
          const cleanText = parseToolResult(resultStr);
          const summary = cleanText.length > 500 ? cleanText.slice(0, 500) + '...' : cleanText;

          // Always collect summary for auto-resume
          state.taskNotificationSummaries.push({
            taskId: mappedTaskId,
            summary: summary.slice(0, 1000),
            status: isErr ? 'failed' : 'completed',
          });

          // Only emit teammate_completed if not already done via task_notification
          if (stillActive) {
            const originalStart =
              state.teammateStartTimes.get(mappedTaskId) ??
              state.teammateStartTimes.get(block.tool_use_id) ??
              Date.now();
            const originalDesc =
              state.teammateDescriptions.get(mappedTaskId) ??
              state.teammateDescriptions.get(block.tool_use_id) ??
              '';
            const originalPrompt =
              state.teammatePrompts.get(mappedTaskId) ??
              state.teammatePrompts.get(block.tool_use_id);
            const history =
              state.teammateToolHistories.get(mappedTaskId) ??
              state.teammateToolHistories.get(block.tool_use_id) ??
              [];

            const teammate: TeammateState = {
              taskId: mappedTaskId,
              description: originalDesc,
              prompt: originalPrompt,
              index: existingIdx,
              status: isErr ? 'failed' : 'completed',
              summary,
              toolHistory: [...history],
              startedAt: originalStart,
              endedAt: Date.now(),
            };

            const completedEvent: StreamEventData = {
              type: 'teammate_completed',
              data: '',
              sessionId: sid,
              teammate,
            };
            enqueue(enc.encode(encodeSSE(completedEvent)));
            state.log.info('Teammate completed via tool result', {
              toolUseId: block.tool_use_id,
              isErr,
            });
          } else {
            state.log.info(
              'Skipping duplicate teammate_completed (already done via task_notification)',
              { toolUseId: block.tool_use_id },
            );
          }
        }
      }

      const tc = state.toolCalls.find((t) => t.id === block.tool_use_id);
      if (tc) {
        tc.result = resultStr;
        tc.status = isErr ? 'error' : 'completed';
      }

      const toolResultEvent: StreamEventData = {
        type: 'tool_result',
        data: resultStr,
        sessionId: sid,
        toolId: block.tool_use_id,
      };
      enqueue(enc.encode(encodeSSE(toolResultEvent)));
    }
  }
}
