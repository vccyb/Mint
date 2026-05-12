import type {
  ChatMessage, ToolCallInfo, SkillLoadInfo, PermissionRequestData,
  AskQuestionItem, TodoItem, TeammateState, StreamEventData,
} from '@/types';
import { generateId } from '@/lib/utils';

/**
 * Shared SSE event handler for use-chat-stream.ts.
 * Eliminates the duplication between sendMessage and approvePlan.
 *
 * This is a set of pure functions that return state updates,
 * so they can be called from both methods.
 */

export interface StreamEventContext {
  sessionId: string;
  assistantId: string;
  resolvedSessionId: string | null;
  mode: string;
}

export interface StreamEventCallbacks {
  updateMessages: (sessionId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  setPendingPermissions: (updater: (prev: Map<string, PermissionRequestData>) => Map<string, PermissionRequestData>) => void;
  setTeammatesMap: (updater: (prev: Map<string, TeammateState[]>) => Map<string, TeammateState[]>) => void;
  setWaitingResumeMap: (updater: (prev: Map<string, boolean>) => Map<string, boolean>) => void;
  registryComplete: (sessionId: string) => void;
  removeAbortController: (sessionId: string) => void;
  removeStreamingId: (sessionId: string) => void;
  removeStreamStartTime: (sessionId: string) => void;
}

/** Process a single SSE event and apply state updates. */
export function handleStreamEvent(
  event: StreamEventData,
  ctx: StreamEventContext,
  cb: StreamEventCallbacks,
): void {
  const sid = ctx.sessionId;
  const assistantId = ctx.assistantId;

  if (event.type === 'content' && event.data !== undefined) {
    const text = event.data;
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: m.content + text, isPlanMode: event.isPlanMode || m.isPlanMode }
          : m,
      ),
    );
  } else if (event.type === 'thinking' && event.thinkingDelta) {
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, thinkingContent: (m.thinkingContent ?? '') + event.thinkingDelta }
          : m,
      ),
    );
  } else if (event.type === 'tool_start') {
    const tc: ToolCallInfo = {
      id: event.toolId ?? generateId(),
      name: event.toolName ?? 'unknown',
      args: event.toolArgs ?? {},
      status: 'running',
    };
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
          : m,
      ),
    );
  } else if (event.type === 'tool_result') {
    cb.updateMessages(sid, (prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;
        const toolCalls = m.toolCalls?.map((t) =>
          t.id === event.toolId ? { ...t, result: event.data, status: 'completed' as const } : t,
        );
        return { ...m, toolCalls };
      }),
    );
  } else if (event.type === 'skill_load') {
    const sl: SkillLoadInfo = {
      id: generateId(),
      name: event.skillName ?? '',
      description: event.skillDescription ?? '',
      status: 'loaded',
    };
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, skillLoads: [...(m.skillLoads ?? []), sl] }
          : m,
      ),
    );
  } else if (event.type === 'todo_update') {
    const todos = event.todos ?? [];
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, todos } : m,
      ),
    );
  } else if (event.type === 'result') {
    cb.updateMessages(sid, (prev) =>
      prev.map((m) => {
        if (m.id === assistantId) {
          // Auto-complete any remaining in_progress todos
          const todos = m.todos?.map((t: TodoItem) =>
            t.status === 'in_progress' ? { ...t, status: 'completed' as const } : t
          );
          return { ...m, isStreaming: false, todos };
        }
        return m;
      }),
    );
    cleanupSession(sid, ctx.resolvedSessionId, ctx.mode, cb);
  } else if (event.type === 'error') {
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              errorInfo: { code: event.errorCode ?? 'INTERNAL_ERROR', message: event.data ?? 'Unknown error' },
              isStreaming: false,
            }
          : m,
      ),
    );
    cleanupSession(sid, ctx.resolvedSessionId, ctx.mode, cb);
  } else if (event.type === 'permission_request') {
    const permData: PermissionRequestData = {
      requestId: event.requestId ?? '',
      toolName: event.toolName ?? 'AskUserQuestion',
      toolUseId: event.toolId ?? '',
      input: event.toolArgs ?? {},
      decisionReason: event.decisionReason,
    };
    cb.setPendingPermissions((prev) => new Map(prev).set(sid, permData));

    if (permData.toolName !== 'AskUserQuestion') {
      const questions = (permData.input.questions ?? []) as AskQuestionItem[];
      const questionContent = questions.length > 0
        ? questions.map((q) => q.question).join('\n')
        : `Allow ${permData.toolName}?`;
      const questionMsg: ChatMessage = {
        id: `q-${permData.requestId}`,
        role: 'question' as const,
        content: questionContent,
        timestamp: Date.now(),
        questionData: questions,
      };
      cb.updateMessages(sid, (prev) => [...prev, questionMsg]);
    }
  } else if (event.type === 'teammate_started' && event.teammate) {
    cb.setTeammatesMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(sid) ?? [];
      next.set(sid, [...existing, { ...event.teammate! }]);
      return next;
    });
  } else if (event.type === 'teammate_progress' && event.teammate) {
    const matchId = event.teammate!.taskId;
    const matchToolUseId = event.teammate!.toolUseId;
    cb.setTeammatesMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(sid) ?? [];
      next.set(
        sid,
        existing.map((t) =>
          t.taskId === matchId || (matchToolUseId && t.taskId === matchToolUseId)
            ? { ...t, ...event.teammate!, status: 'running' }
            : t,
        ),
      );
      return next;
    });
  } else if (event.type === 'teammate_completed' && event.teammate) {
    const matchId = event.teammate!.taskId;
    const matchToolUseId = event.teammate!.toolUseId;
    cb.setTeammatesMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(sid) ?? [];
      next.set(
        sid,
        existing.map((t) =>
          t.taskId === matchId || (matchToolUseId && t.taskId === matchToolUseId)
            ? { ...t, ...event.teammate!, status: event.teammate!.status }
            : t,
        ),
      );
      return next;
    });
  } else if (event.type === 'team_waiting_resume') {
    cb.setWaitingResumeMap((prev) => new Map(prev).set(sid, true));
  } else if (event.type === 'plan_result') {
    cb.updateMessages(sid, (prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: m.content + event.data, isPlanMode: true }
          : m,
      ),
    );
  }
}

function cleanupSession(
  sid: string,
  resolvedSessionId: string | null,
  mode: string,
  cb: StreamEventCallbacks,
): void {
  if (resolvedSessionId && mode === 'agent') {
    cb.registryComplete(resolvedSessionId);
  }
  cb.setWaitingResumeMap((prev) => { const n = new Map(prev); n.delete(sid); return n; });
  cb.removeAbortController(sid);
  cb.removeStreamingId(sid);
  cb.removeStreamStartTime(sid);
}
