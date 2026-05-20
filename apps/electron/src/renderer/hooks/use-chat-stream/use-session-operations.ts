
import { useCallback } from 'react';
import type { ChatMessage, Mode, TodoItem } from '@/types';
import { isDraftSessionKey, createDraftSessionKey } from '@/lib/session-key';
import type { StreamingRegistry } from '@/lib/streaming-registry';

interface SessionOperationsDeps {
  mode: Mode;
  registry: StreamingRegistry;
  activeSessionKeyRef: React.MutableRefObject<string>;
  messagesMap: Map<string, ChatMessage[]>;
  messagesMapRef: React.MutableRefObject<Map<string, ChatMessage[]>>;
  abortControllersRef: React.MutableRefObject<Map<string, AbortController>>;
  setMessagesMap: React.Dispatch<React.SetStateAction<Map<string, ChatMessage[]>>>;
  setTeammatesMap: React.Dispatch<React.SetStateAction<Map<string, import('@/types').TeammateState[]>>>;
  setWaitingResumeMap: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  setLocalStreamingSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setStreamStartTimes: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setPermissionStates: React.Dispatch<
    React.SetStateAction<Map<string, import('./use-session-state').SessionPermissionState>>
  >;
  setPendingPermissions: React.Dispatch<
    React.SetStateAction<Map<string, import('@/types').PermissionRequestData>>
  >;
  setActiveSessionKey: React.Dispatch<React.SetStateAction<string>>;
  updateMessagesForSession: (
    sid: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) => void;
}

export function useSessionOperations(deps: SessionOperationsDeps) {
  const {
    mode,
    registry,
    activeSessionKeyRef,
    messagesMap,
    messagesMapRef,
    abortControllersRef,
    setMessagesMap,
    setTeammatesMap,
    setWaitingResumeMap,
    setLocalStreamingSessionIds,
    setStreamStartTimes,
    setPermissionStates,
    setPendingPermissions,
    setActiveSessionKey,
    updateMessagesForSession,
  } = deps;

  const loadSession = useCallback(async (id: string) => {
    setActiveSessionKey(id);
    setTeammatesMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setWaitingResumeMap((prev) => {
      const n = new Map(prev);
      n.delete(id);
      return n;
    });
    setMessagesMap((prev) => {
      const next = new Map(prev);
      if (!next.has(id)) next.set(id, []);
      return next;
    });
    try {
      const data = await window.electronAPI.getSession(id);
      if (data && data.messages) {
        const normalizedMessages = data.messages.map((m: ChatMessage) => {
          if (m.todos && m.todos.length > 0 && !m.isStreaming) {
            return {
              ...m,
              todos: m.todos.map((t: TodoItem) =>
                t.status === 'in_progress' ? { ...t, status: 'completed' as const } : t,
              ),
            };
          }
          return m;
        });
        setMessagesMap((prev) => {
          const next = new Map(prev);
          const existing = prev.get(id);
          if (!existing || existing.length < normalizedMessages.length)
            next.set(id, normalizedMessages);
          return next;
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const stopStreaming = useCallback(() => {
    const target = activeSessionKeyRef.current;
    // Send abort via IPC (fire-and-forget, don't block local cleanup)
    if (!isDraftSessionKey(target)) {
      if (mode === 'chat') {
        window.electronAPI.chatAbort(target).catch(() => {});
      } else {
        window.electronAPI.agentAbort(target).catch(() => {});
      }
    }
    abortControllersRef.current.delete(target);
    if (!isDraftSessionKey(target) && mode === 'agent') registry.abort(target);
    if (!isDraftSessionKey(target) && mode === 'agent') registry.complete(target);
    setLocalStreamingSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(target);
      return next;
    });
    setStreamStartTimes((prev) => {
      const n = new Map(prev);
      n.delete(target);
      return n;
    });
    setWaitingResumeMap((prev) => {
      const n = new Map(prev);
      n.delete(target);
      return n;
    });
    updateMessagesForSession(target, (prev) =>
      prev.map((m) => {
        if (!m.isStreaming) return m;
        return {
          ...m,
          isStreaming: false,
          toolCalls: (m.toolCalls ?? []).map((t) =>
            t.status === 'running' ? { ...t, status: 'error' as const, result: 'Cancelled' } : t,
          ),
        };
      }),
    );
    setTeammatesMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(target) ?? [];
      if (existing.length > 0) {
        next.set(
          target,
          existing.map((t) =>
            t.status === 'running' ? { ...t, status: 'stopped' as const, endedAt: Date.now() } : t,
          ),
        );
      }
      return next;
    });
    setWaitingResumeMap((prev) => {
      const next = new Map(prev);
      next.delete(target);
      return next;
    });
  }, [mode, registry, updateMessagesForSession]);

  const clearSession = useCallback(() => {
    const current = activeSessionKeyRef.current;
    const nextDraftKey = createDraftSessionKey(mode);
    if (isDraftSessionKey(current) && (messagesMap.get(current)?.length ?? 0) === 0) {
      setPermissionStates((prev) => {
        if (!prev.has(current)) return prev;
        const next = new Map(prev);
        next.delete(current);
        return next;
      });
      setPendingPermissions((prev) => {
        if (!prev.has(current)) return prev;
        const next = new Map(prev);
        next.delete(current);
        return next;
      });
    }
    setActiveSessionKey(nextDraftKey);
  }, [messagesMap, mode]);

  const forkFromMessage = useCallback(
    async (messageId: string) => {
      const sid = activeSessionKeyRef.current;
      if (isDraftSessionKey(sid)) return;

      // Truncate server-side
      const result = await window.electronAPI.forkSession(sid, messageId);
      if (!result.success) return;

      // Update local messages: keep only messages before the fork point
      updateMessagesForSession(sid, (prev) => {
        const idx = prev.findIndex((m) => m.id === messageId);
        if (idx < 0) return prev;
        return prev.slice(0, idx);
      });

      // Also clear teammates and pending state from this point
      setTeammatesMap((prev) => {
        const next = new Map(prev);
        next.delete(sid);
        return next;
      });
      setPendingPermissions((prev) => {
        const next = new Map(prev);
        next.delete(sid);
        return next;
      });
    },
    [updateMessagesForSession, setTeammatesMap, setPendingPermissions],
  );

  return { loadSession, stopStreaming, clearSession, forkFromMessage };
}
