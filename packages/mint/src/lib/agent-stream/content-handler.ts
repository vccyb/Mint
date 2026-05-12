import { encodeSSE } from '@/lib/sse';
import { generateId } from '@/lib/utils';
import type { StreamEventData, ToolCallInfo, TodoItem, TeammateState } from '@/types';
import { extractTaskDescription, isSkillRead } from './skill-utils';
import type { SessionStreamState } from './session-context';

/**
 * Handle SDK stream_event messages: text deltas, thinking deltas,
 * tool use start/input/complete.
 */
export function handleStreamEvent(event: any, state: SessionStreamState, enqueue: (data: Uint8Array) => boolean): void {
  const sid = state.sessionId;

  // Text streaming
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    const text = event.delta.text ?? '';
    state.assistantContent += text;
    const contentEvent: StreamEventData = { type: 'content', data: text, sessionId: sid };
    enqueue(new TextEncoder().encode(encodeSSE(contentEvent)));
  }

  // Extended Thinking streaming
  if (event.type === 'content_block_delta' && event.delta?.type === 'thinking_delta') {
    const text = event.delta.thinking ?? '';
    state.thinkingContent += text;
    const thinkingEvent: StreamEventData = { type: 'thinking', data: '', sessionId: sid, thinkingDelta: text };
    enqueue(new TextEncoder().encode(encodeSSE(thinkingEvent)));
  }

  // Tool use start
  if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
    state.currentToolId = event.content_block.id ?? null;
    state.currentToolName = event.content_block.name ?? null;
    state.currentToolInput = '';
  }

  // Tool input delta
  if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
    state.currentToolInput += event.delta.partial_json ?? '';
  }

  // Tool complete
  if (event.type === 'content_block_stop' && state.currentToolId && state.currentToolName) {
    handleToolComplete(state, enqueue);
  }
}

function handleToolComplete(state: SessionStreamState, enqueue: (data: Uint8Array) => boolean): void {
  const sid = state.sessionId;
  const toolId = state.currentToolId!;
  const toolName = state.currentToolName!;

  let parsedArgs: Record<string, unknown> = {};
  try {
    parsedArgs = JSON.parse(state.currentToolInput || '{}');
  } catch {
    parsedArgs = {};
  }

  if (toolName === 'TodoWrite') {
    state.todoWriteToolIds.add(toolId);
    const todos = (parsedArgs.todos ?? []) as TodoItem[];
    state.latestTodos = todos;
    const todoEvent: StreamEventData = { type: 'todo_update', data: '', sessionId: sid, todos };
    enqueue(new TextEncoder().encode(encodeSSE(todoEvent)));
  } else if (toolName === 'Task' || toolName === 'Agent') {
    const taskDescription = extractTaskDescription(parsedArgs);
    const startTime = Date.now();
    const promptStr = typeof parsedArgs.prompt === 'string' ? parsedArgs.prompt
      : typeof parsedArgs.description === 'string' ? parsedArgs.description
      : '';

    // Bridge data for future SDK upgrade (task_started path)
    state.pendingTaskDescriptions.set(toolId, taskDescription);
    state.pendingTaskStartTimes.set(toolId, startTime);
    if (promptStr) state.pendingTaskInputs.set(toolId, promptStr);

    state.taskToolIds.add(toolId);
    state.log.info('Task tool args', { toolName, args: JSON.stringify(parsedArgs).slice(0, 200) });

    // Create teammate (primary path — SDK does not expose task_started events)
    const idx = state.nextTeammateIndex++;
    state.teammateIndexMap.set(toolId, idx);
    state.startedTaskIds.add(toolId);
    state.teammateStartTimes.set(toolId, startTime);
    state.teammateDescriptions.set(toolId, taskDescription);
    state.teammateToolHistories.set(toolId, []);
    if (promptStr) state.teammatePrompts.set(toolId, promptStr);

    const taskType = toolName === 'Task' ? 'local_agent' : 'subagent';
    const teammate: TeammateState = {
      taskId: toolId, toolUseId: toolId, description: taskDescription,
      prompt: promptStr || undefined,
      taskType, index: idx, status: 'running', toolHistory: [], startedAt: startTime,
    };
    const teammateEvent: StreamEventData = { type: 'teammate_started', data: '', sessionId: sid, teammate };
    enqueue(new TextEncoder().encode(encodeSSE(teammateEvent)));
    state.log.info('Teammate started via tool call', { toolName, taskId: toolId });

    // Also track as a normal tool call
    state.toolCalls.push({ id: toolId, name: toolName, args: parsedArgs, status: 'running' });
    const toolEvent: StreamEventData = { type: 'tool_start', data: '', sessionId: sid, toolName, toolId, toolArgs: parsedArgs };
    enqueue(new TextEncoder().encode(encodeSSE(toolEvent)));
  } else {
    state.toolCalls.push({ id: toolId, name: toolName, args: parsedArgs, status: 'running' });

    // Detect skill Read
    if (state.skillsEnabled) {
      const matched = isSkillRead(toolName, parsedArgs, state.skillPathMap);
      if (matched) {
        state.skillLoads.push({ id: generateId(), name: matched.name, description: matched.description, status: 'loaded' });
        const skillLoadEvent: StreamEventData = { type: 'skill_load', data: '', sessionId: sid, skillName: matched.name, skillDescription: matched.description };
        enqueue(new TextEncoder().encode(encodeSSE(skillLoadEvent)));
      }
    }

    const toolEvent: StreamEventData = { type: 'tool_start', data: '', sessionId: sid, toolName, toolId, toolArgs: parsedArgs };
    enqueue(new TextEncoder().encode(encodeSSE(toolEvent)));
  }

  // Reset current tool state
  state.currentToolId = null;
  state.currentToolName = null;
  state.currentToolInput = '';
}
