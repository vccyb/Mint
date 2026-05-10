import { encodeSSE } from '@/lib/sse';
import type { StreamEventData, TeammateState } from '@/types';
import type { SessionStreamState } from './session-context';

/**
 * Handle SDK system messages: task_started, task_progress, task_notification.
 * Manages the teammate lifecycle from SDK-emitted system events.
 */
export function handleSystemMessage(sysMsg: any, state: SessionStreamState, enqueue: (data: Uint8Array) => boolean): void {
  const sid = state.sessionId;
  const enc = new TextEncoder();

  // Capture SDK session ID for auto-resume
  if (sysMsg.subtype === 'init' && sysMsg.session_id) {
    state.capturedSdkSessionId = sysMsg.session_id;
  }

  // Teammate started (from SDK system event)
  if (
    sysMsg.subtype === 'task_started' &&
    sysMsg.task_id &&
    (sysMsg.task_type === 'local_agent' || sysMsg.task_type === 'remote_agent')
  ) {
    state.startedTaskIds.add(sysMsg.task_id);
    const idx = state.nextTeammateIndex++;
    state.teammateIndexMap.set(sysMsg.task_id, idx);
    state.teammateToolHistories.set(sysMsg.task_id, []);

    const teammate: TeammateState = {
      taskId: sysMsg.task_id,
      toolUseId: sysMsg.tool_use_id,
      description: sysMsg.description ?? 'Working...',
      taskType: sysMsg.task_type,
      index: idx,
      status: 'running',
      toolHistory: [],
      startedAt: Date.now(),
    };

    const teammateEvent: StreamEventData = { type: 'teammate_started', data: '', sessionId: sid, teammate };
    enqueue(enc.encode(encodeSSE(teammateEvent)));
    state.log.info('Teammate started', { taskId: sysMsg.task_id, taskType: sysMsg.task_type });
  }

  // Teammate progress
  if (sysMsg.subtype === 'task_progress' && sysMsg.task_id) {
    const existingIdx = state.teammateIndexMap.get(sysMsg.task_id);
    if (existingIdx !== undefined) {
      const history = state.teammateToolHistories.get(sysMsg.task_id) ?? [];
      if (sysMsg.last_tool_name && history[history.length - 1] !== sysMsg.last_tool_name) {
        history.push(sysMsg.last_tool_name);
        state.teammateToolHistories.set(sysMsg.task_id, history);
      }

      const originalStart = state.teammateStartTimes.get(sysMsg.task_id) ?? Date.now();
      const originalDesc = state.teammateDescriptions.get(sysMsg.task_id) ?? '';
      const elapsed = sysMsg.last_tool_name
        ? Math.round((Date.now() - originalStart) / 1000)
        : undefined;

      const teammate: TeammateState = {
        taskId: sysMsg.task_id, description: originalDesc, index: existingIdx,
        status: 'running', progressDescription: sysMsg.description,
        currentToolName: sysMsg.last_tool_name, currentToolElapsedSeconds: elapsed,
        toolHistory: [...history], startedAt: originalStart,
      };

      const progressEvent: StreamEventData = { type: 'teammate_progress', data: '', sessionId: sid, teammate };
      enqueue(enc.encode(encodeSSE(progressEvent)));
    }
  }

  // Teammate completed (task_notification)
  if (sysMsg.subtype === 'task_notification' && sysMsg.task_id) {
    state.startedTaskIds.delete(sysMsg.task_id);
    const existingIdx = state.teammateIndexMap.get(sysMsg.task_id);
    if (existingIdx !== undefined) {
      const originalStart = state.teammateStartTimes.get(sysMsg.task_id) ?? Date.now();
      const history = state.teammateToolHistories.get(sysMsg.task_id) ?? [];

      const teammate: TeammateState = {
        taskId: sysMsg.task_id, description: '', index: existingIdx,
        status: (sysMsg.status === 'failed' ? 'failed' : sysMsg.status === 'stopped' ? 'stopped' : 'completed') as TeammateState['status'],
        summary: sysMsg.summary, outputFile: sysMsg.output_file,
        usage: sysMsg.usage ? {
          totalTokens: sysMsg.usage.total_tokens,
          toolUses: sysMsg.usage.tool_uses,
          durationMs: sysMsg.usage.duration_ms,
        } : undefined,
        toolHistory: [...history], startedAt: originalStart, endedAt: Date.now(),
      };

      const completedEvent: StreamEventData = { type: 'teammate_completed', data: '', sessionId: sid, teammate };
      enqueue(enc.encode(encodeSSE(completedEvent)));
    }

    if (sysMsg.summary) {
      state.taskNotificationSummaries.push({
        taskId: sysMsg.task_id, summary: sysMsg.summary, status: sysMsg.status,
      });
    }
    state.log.info('Teammate completed', { taskId: sysMsg.task_id, status: sysMsg.status });
  }
}
