
import { useCallback } from 'react';
import type { ChatMessage, Mode, Attachment } from '@/types';
import { isDraftSessionKey } from '@/lib/session-key';
import { generateId } from '@/lib/utils';
import type { StreamingRegistry } from '@/lib/streaming-registry';
import type { SessionStateReturn } from './use-session-state';
import type { SSEStreamReturn } from './use-sse-stream';

interface ChatActionsDeps {
  mode: Mode;
  registry: StreamingRegistry;
  state: SessionStateReturn;
  sseStream: SSEStreamReturn;
}

export function useChatActions(deps: ChatActionsDeps) {
  const { mode, registry, state, sseStream } = deps;

  const sendMessage = useCallback(
    async (
      message: string,
      attachments?: Attachment[],
      mentionedTools?: unknown[],
      enableThinking?: boolean,
    ) => {
      if (mode === 'agent' && !registry.canStartNew()) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      };

      const targetSessionKey = state.activeSessionKeyRef.current;
      state.updateMessagesForSession(targetSessionKey, (prev) => [...prev, userMsg, assistantMsg]);

      // Clear previous teammates
      state.setTeammatesMap((prev) => {
        const next = new Map(prev);
        next.delete(targetSessionKey);
        return next;
      });
      state.setWaitingResumeMap((prev) => {
        const next = new Map(prev);
        next.delete(targetSessionKey);
        return next;
      });

      const startTime = Date.now();
      state.setStreamStartTimes((prev) => new Map(prev).set(targetSessionKey, startTime));

      // Create a lightweight abort controller for local tracking
      const abortController = new AbortController();
      state.abortControllersRef.current.set(targetSessionKey, abortController);
      state.setLocalStreamingSessionIds((prev) => new Set(prev).add(targetSessionKey));

      const requestSessionId = isDraftSessionKey(targetSessionKey) ? undefined : targetSessionKey;
      const requestPermissionMode =
        state.permissionStatesRef.current.get(targetSessionKey)?.mode ?? 'default';
      let resolvedSessionId = requestSessionId ?? null;

      if (mode === 'agent' && resolvedSessionId) {
        registry.register(resolvedSessionId, mode, abortController);
      }

      // Subscribe to IPC stream events before sending
      const unsubscribe = sseStream.subscribeToStreamEvents(
        targetSessionKey,
        assistantId,
        mode === 'chat' ? 'chat' : 'agent',
        (newSid) => {
          resolvedSessionId = newSid;
          state.migrateSessionState(targetSessionKey, newSid);
          if (mode === 'agent') registry.register(newSid, mode, abortController);

          const currentMessages = state.messagesMapRef.current.get(targetSessionKey) ?? [];
          if (currentMessages.length <= 2) {
            const userMsg = currentMessages.find((m) => m.role === 'user');
            if (userMsg && userMsg.content) {
              const newTitle =
                userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? '...' : '');
              window.electronAPI.updateSession(newSid, { title: newTitle }).catch(() => {});
            }
          }
        },
      );

      try {
        const input: Record<string, unknown> = {
          message,
          sessionId: requestSessionId,
          attachments,
          mentionedTools,
          ...(mode === 'chat' ? { enableThinking } : {}),
          ...(mode === 'agent'
            ? { permissionMode: requestPermissionMode, projectId: state.projectIdRef.current }
            : {}),
        };

        const result =
          mode === 'chat'
            ? await window.electronAPI.chatSend(input)
            : await window.electronAPI.agentSend(input);

        if (!result.ok) {
          unsubscribe();
          const sid = resolvedSessionId ?? targetSessionKey;
          state.updateMessagesForSession(sid, (prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    errorInfo: {
                      code: 'INTERNAL_ERROR' as const,
                      message: 'Request failed',
                    },
                    isStreaming: false,
                  }
                : m,
            ),
          );
          sseStream.cleanupSession(sid, resolvedSessionId);
          return;
        }

        // Fire-and-forget: the IPC listener (subscribeToStreamEvents) handles
        // all subsequent events. When the stream ends (result/error event),
        // the listener's handleStreamEvent calls cleanupSession via callbacks.
        // We just need to ensure the unsubscribe runs when the stream is done.
        // The cleanup happens inside handleStreamEvent on result/error events.
      } catch (error) {
        unsubscribe();
        const sid = resolvedSessionId ?? targetSessionKey;
        state.updateMessagesForSession(sid, (prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  errorInfo: {
                    code: 'NETWORK_ERROR' as const,
                    message: error instanceof Error ? error.message : 'Connection failed',
                  },
                  isStreaming: false,
                }
              : m,
          ),
        );
        sseStream.cleanupSession(sid, resolvedSessionId);
      }
    },
    [mode, registry, state, sseStream],
  );

  const approvePlan = useCallback(
    async (approvalMode: 'auto' | 'manual') => {
      const activeId = state.activeSessionKeyRef.current;
      if (isDraftSessionKey(activeId)) return;

      const currentMessages = state.messagesMapRef.current.get(activeId) ?? [];
      const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg) return;

      const permMode = approvalMode === 'auto' ? 'bypassPermissions' : 'default';
      const newAssistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: newAssistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      };

      state.setStreamStartTimes((prev) => new Map(prev).set(activeId, Date.now()));
      state.updateMessagesForSession(activeId, (prev) => [...prev, assistantMsg]);

      const abortController = new AbortController();
      state.abortControllersRef.current.set(activeId, abortController);
      state.setLocalStreamingSessionIds((prev) => new Set(prev).add(activeId));
      registry.register(activeId, mode, abortController);

      // Subscribe to IPC stream events before sending
      const unsubscribe = sseStream.subscribeToStreamEvents(
        activeId,
        newAssistantId,
        'agent',
      );

      try {
        const result = await window.electronAPI.agentSend({
          message: lastUserMsg.content,
          sessionId: activeId,
          permissionMode: permMode,
          planApproval: true,
        });

        if (!result.ok) {
          unsubscribe();
          state.updateMessagesForSession(activeId, (prev) =>
            prev.map((m) =>
              m.id === newAssistantId
                ? {
                    ...m,
                    errorInfo: {
                      code: 'INTERNAL_ERROR' as const,
                      message: 'Failed to execute plan',
                    },
                    isStreaming: false,
                  }
                : m,
            ),
          );
          sseStream.cleanupSession(activeId, activeId);
          return;
        }

        // Fire-and-forget: IPC listener handles stream events
      } catch (error) {
        unsubscribe();
        state.updateMessagesForSession(activeId, (prev) =>
          prev.map((m) =>
            m.id === newAssistantId
              ? {
                  ...m,
                  errorInfo: {
                    code: 'NETWORK_ERROR' as const,
                    message: error instanceof Error ? error.message : 'Execution failed',
                  },
                  isStreaming: false,
                }
              : m,
          ),
        );
        sseStream.cleanupSession(activeId, activeId);
      }
    },
    [mode, registry, state, sseStream],
  );

  return { sendMessage, approvePlan };
}
