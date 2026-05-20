import { encodeSSE } from '../sse';
import type { StreamEventData, TeammateState } from '../../../types';
import type { SessionStreamState } from './session-context';

/**
 * Handle SDK system messages: task_started, task_progress, task_notification.
 * Manages the teammate lifecycle from SDK-emitted system events.
 */
export function handleSystemMessage(
  sysMsg: any,
  state: SessionStreamState,
  enqueue: (data: Uint8Array) => boolean,
): void {
  const sid = state.sessionId;
  const enc = new TextEncoder();

  // Capture SDK session ID for auto-resume
  if (sysMsg.subtype === 'init' && sysMsg.session_id) {
    state.capturedSdkSessionId = sysMsg.session_id;
  }

  // Context compaction events
  if (sysMsg.subtype === 'compacting') {
    const compactingEvent: StreamEventData = {
      type: 'compacting',
      data: '',
      sessionId: sid,
    };
    enqueue(enc.encode(encodeSSE(compactingEvent)));
  }

  if (sysMsg.subtype === 'compact_boundary') {
    const completeEvent: StreamEventData = {
      type: 'compact_complete',
      data: '',
      sessionId: sid,
    };
    enqueue(enc.encode(encodeSSE(completeEvent)));
  }

  // Teammate started (from SDK system event)
  if (
    sysMsg.subtype === 'task_started' &&
    sysMsg.task_id &&
    (sysMsg.task_type === 'local_agent' || sysMsg.task_type === 'remote_agent')
  ) {
    state.startedTaskIds.add(sysMsg.task_id);

    // Bridge: consume data stored by content-handler when Task/Agent tool was called
    let description = sysMsg.description ?? 'Working...';
    let startTime = Date.now();
    let prompt: string | undefined;
    if (sysMsg.tool_use_id) {
      const bridgedDesc = state.pendingTaskDescriptions.get(sysMsg.tool_use_id);
      if (bridgedDesc) description = bridgedDesc;
      const bridgedStart = state.pendingTaskStartTimes.get(sysMsg.tool_use_id);
      if (bridgedStart) startTime = bridgedStart;
      const bridgedPrompt = state.pendingTaskInputs.get(sysMsg.tool_use_id);
      if (bridgedPrompt) prompt = bridgedPrompt;
      // Map tool_use_id → task_id for tool-result-handler cleanup
      state.pendingTaskToTaskId.set(sysMsg.tool_use_id, sysMsg.task_id);
    }

    // Check: did content-handler already create this teammate (via tool_use_id)?
    const existingIdx = sysMsg.tool_use_id
      ? state.teammateIndexMap.get(sysMsg.tool_use_id)
      : undefined;

    if (existingIdx !== undefined) {
      // Content-handler already created it — bridge mappings from toolUseId to real taskId
      state.teammateIndexMap.set(sysMsg.task_id, existingIdx);
      state.teammateIndexMap.delete(sysMsg.tool_use_id);
      state.teammateStartTimes.set(sysMsg.task_id, startTime);
      state.teammateDescriptions.set(sysMsg.task_id, description);
      if (prompt) state.teammatePrompts.set(sysMsg.task_id, prompt);
      const history = state.teammateToolHistories.get(sysMsg.tool_use_id) ?? [];
      state.teammateToolHistories.set(sysMsg.task_id, history);
      state.teammateToolHistories.delete(sysMsg.tool_use_id);

      // Emit progress (not started) to update the existing teammate with real taskId
      const teammate: TeammateState = {
        taskId: sysMsg.task_id,
        toolUseId: sysMsg.tool_use_id,
        description,
        prompt,
        taskType: sysMsg.task_type,
        index: existingIdx,
        status: 'running',
        toolHistory: [...history],
        startedAt: startTime,
      };
      const progressEvent: StreamEventData = {
        type: 'teammate_progress',
        data: '',
        sessionId: sid,
        teammate,
      };
      enqueue(enc.encode(encodeSSE(progressEvent)));
      state.log.info('Teammate bridged (toolUseId → taskId)', {
        toolUseId: sysMsg.tool_use_id,
        taskId: sysMsg.task_id,
      });
    } else {
      // No existing teammate — create new one (sole source path)
      const idx = state.nextTeammateIndex++;
      state.teammateIndexMap.set(sysMsg.task_id, idx);
      state.teammateToolHistories.set(sysMsg.task_id, []);
      state.teammateStartTimes.set(sysMsg.task_id, startTime);
      state.teammateDescriptions.set(sysMsg.task_id, description);
      if (prompt) state.teammatePrompts.set(sysMsg.task_id, prompt);

      const teammate: TeammateState = {
        taskId: sysMsg.task_id,
        toolUseId: sysMsg.tool_use_id,
        description,
        prompt,
        taskType: sysMsg.task_type,
        index: idx,
        status: 'running',
        toolHistory: [],
        startedAt: startTime,
      };

      const teammateEvent: StreamEventData = {
        type: 'teammate_started',
        data: '',
        sessionId: sid,
        teammate,
      };
      enqueue(enc.encode(encodeSSE(teammateEvent)));
      state.log.info('Teammate started (sole source)', {
        taskId: sysMsg.task_id,
        taskType: sysMsg.task_type,
      });
    }
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
        taskId: sysMsg.task_id,
        description: originalDesc,
        index: existingIdx,
        status: 'running',
        progressDescription: sysMsg.description,
        currentToolName: sysMsg.last_tool_name,
        currentToolElapsedSeconds: elapsed,
        toolHistory: [...history],
        startedAt: originalStart,
      };

      const progressEvent: StreamEventData = {
        type: 'teammate_progress',
        data: '',
        sessionId: sid,
        teammate,
      };
      enqueue(enc.encode(encodeSSE(progressEvent)));
    }
  }

  // Teammate completed (task_notification)
  if (sysMsg.subtype === 'task_notification' && sysMsg.task_id) {
    const wasActive = state.startedTaskIds.has(sysMsg.task_id);
    state.startedTaskIds.delete(sysMsg.task_id);

    // Always collect summary for auto-resume
    if (sysMsg.summary) {
      state.taskNotificationSummaries.push({
        taskId: sysMsg.task_id,
        summary: sysMsg.summary,
        status: sysMsg.status,
      });
    }

    if (!wasActive) {
      state.log.info('Skipping duplicate task_notification (already completed via tool_result)', {
        taskId: sysMsg.task_id,
      });
    } else {
      const existingIdx = state.teammateIndexMap.get(sysMsg.task_id);
      if (existingIdx !== undefined) {
        const originalStart = state.teammateStartTimes.get(sysMsg.task_id) ?? Date.now();
        const originalDesc = state.teammateDescriptions.get(sysMsg.task_id) ?? '';
        const originalPrompt = state.teammatePrompts.get(sysMsg.task_id);
        const history = state.teammateToolHistories.get(sysMsg.task_id) ?? [];

        const teammate: TeammateState = {
          taskId: sysMsg.task_id,
          description: originalDesc,
          prompt: originalPrompt,
          index: existingIdx,
          status: (sysMsg.status === 'failed'
            ? 'failed'
            : sysMsg.status === 'stopped'
              ? 'stopped'
              : 'completed') as TeammateState['status'],
          summary: sysMsg.summary,
          outputFile: sysMsg.output_file,
          usage: sysMsg.usage
            ? {
                totalTokens: sysMsg.usage.total_tokens,
                toolUses: sysMsg.usage.tool_uses,
                durationMs: sysMsg.usage.duration_ms,
              }
            : undefined,
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
      }
    }
    state.log.info('Teammate completed', { taskId: sysMsg.task_id, status: sysMsg.status });
  }
}
