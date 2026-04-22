'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, Mode, StreamEventData, ToolCallInfo, SkillLoadInfo, Attachment, PermissionRequestData, AskQuestionItem, MentionChip, TodoItem } from '@/types';
import { generateId } from '@/lib/utils';
import type { StreamingRegistry } from '@/lib/streaming-registry';

interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  streamStartTime: number | null;
  pendingPermission: PermissionRequestData | null;
  sendMessage: (message: string, attachments?: Attachment[], mentionedTools?: MentionChip[]) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  clearSession: () => void;
  stopStreaming: () => void;
  submitPermissionDecision: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => Promise<void>;
}

export function useChatStream(mode: Mode, registry: StreamingRegistry): UseChatStreamReturn {
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pendingPermission, setPendingPermission] = useState<PermissionRequestData | null>(null);
  const permissionSessionRef = useRef<string | null>(null);

  // Chat mode uses local streaming state (not registry)
  const [localStreamingSessionId, setLocalStreamingSessionId] = useState<string | null>(null);

  // Track stream start time per session for the "正在思考..." timer
  const [streamStartTimes, setStreamStartTimes] = useState<Map<string, number>>(new Map());

  // Ref to avoid stale closure on activeSessionId in SSE handlers
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  // Derived values
  const messages = activeSessionId ? messagesMap.get(activeSessionId) ?? [] : [];
  const streamStartTime = activeSessionId ? streamStartTimes.get(activeSessionId) ?? null : null;
  const isStreaming = (() => {
    if (!activeSessionId) return false;
    if (mode === 'agent') return registry.getStatus(activeSessionId)?.isStreaming ?? false;
    return localStreamingSessionId === activeSessionId;
  })();

  const updateMessagesForSession = useCallback(
    (sessionId: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(sessionId, updater(next.get(sessionId) ?? []));
        return next;
      });
    },
    [],
  );

  const sendMessage = useCallback(
    async (message: string, attachments?: Attachment[], mentionedTools?: MentionChip[]) => {
      // Only agent mode has concurrency limit
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

      // Read current activeSessionId from ref (avoids stale closure)
      const targetSessionId = activeSessionIdRef.current;

      if (targetSessionId) {
        updateMessagesForSession(targetSessionId, (prev) => [...prev, userMsg, assistantMsg]);
      } else {
        // No session yet — use a temporary key, will be updated when sessionId arrives
        const tempKey = `__pending_${assistantId}`;
        setMessagesMap((prev) => {
          const next = new Map(prev);
          next.set(tempKey, [userMsg, assistantMsg]);
          return next;
        });
      }

      // Track stream start time (use targetSessionId or temp key)
      const startTime = Date.now();
      const timeKey = targetSessionId ?? `__pending_${assistantId}`;
      setStreamStartTimes((prev) => new Map(prev).set(timeKey, startTime));

      const endpoint = mode === 'chat' ? '/api/chat' : '/api/agent';
      const abortController = new AbortController();

      // Track the current assistant message's session for SSE updates
      let resolvedSessionId = targetSessionId;

      // Register with registry only for agent mode
      if (mode === 'agent' && targetSessionId) {
        registry.register(targetSessionId, mode, abortController);
      }

      // For chat mode, set local streaming state
      if (mode === 'chat' && targetSessionId) {
        setLocalStreamingSessionId(targetSessionId);
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sessionId: targetSessionId, attachments, mentionedTools }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          const sid = resolvedSessionId ?? `__pending_${assistantId}`;
          updateMessagesForSession(sid, (prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${errorData.error ?? 'Unknown error'}`, isStreaming: false }
                : m,
            ),
          );
          if (resolvedSessionId && mode === 'agent') {
            registry.complete(resolvedSessionId);
          }
          if (mode === 'chat') setLocalStreamingSessionId(null);
          const cleanKey = resolvedSessionId ?? `__pending_${assistantId}`;
          setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(cleanKey); return n; });
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const raw = line.slice(6).trim();
              if (!raw) continue;

              let event: StreamEventData;
              try {
                event = JSON.parse(raw);
              } catch {
                continue;
              }

              // Resolve sessionId from server
              if (event.sessionId && !resolvedSessionId) {
                resolvedSessionId = event.sessionId;

                // Only update activeSessionId if user hasn't switched away
                setActiveSessionId((prev) => {
                  if (prev === null || prev === targetSessionId) return event.sessionId!;
                  return prev;
                });

                // Move messages from temp key to real sessionId
                setMessagesMap((prev) => {
                  const tempKey = `__pending_${assistantId}`;
                  const msgs = prev.get(tempKey);
                  if (msgs) {
                    const next = new Map(prev);
                    next.delete(tempKey);
                    next.set(event.sessionId!, msgs);
                    return next;
                  }
                  return prev;
                });

                // Migrate stream start time from temp key to real sessionId
                setStreamStartTimes((prev) => {
                  const tempKey = `__pending_${assistantId}`;
                  const time = prev.get(tempKey);
                  if (time) {
                    const next = new Map(prev);
                    next.delete(tempKey);
                    next.set(event.sessionId!, time);
                    return next;
                  }
                  return prev;
                });

                // Register with registry now that we have a sessionId
                if (mode === 'agent') {
                  registry.register(event.sessionId, mode, abortController);
                }

                if (mode === 'chat') {
                  setLocalStreamingSessionId(event.sessionId);
                }
              }

              const sid = resolvedSessionId ?? `__pending_${assistantId}`;

              if (event.type === 'content' && event.data) {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.data }
                      : m,
                  ),
                );
              } else if (event.type === 'tool_start') {
                const toolInfo: ToolCallInfo = {
                  id: event.toolId ?? generateId(),
                  name: event.toolName ?? 'unknown',
                  args: event.toolArgs ?? {},
                  status: 'running',
                  startedAt: Date.now(),
                };
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolInfo] }
                      : m,
                  ),
                );
              } else if (event.type === 'skill_load') {
                const skillInfo: SkillLoadInfo = {
                  id: generateId(),
                  name: event.skillName ?? 'unknown',
                  description: event.skillDescription ?? '',
                  status: 'loaded',
                };
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, skillLoads: [...(m.skillLoads ?? []), skillInfo] }
                      : m,
                  ),
                );
              } else if (event.type === 'todo_update') {
                const todos = (event.todos ?? []) as TodoItem[];
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, todos }
                      : m,
                  ),
                );
              } else if (event.type === 'tool_result') {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map((t) =>
                            t.id === event.toolId
                              ? {
                                  ...t,
                                  result: event.data,
                                  status: 'completed' as const,
                                  completedAt: Date.now(),
                                }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
              } else if (event.type === 'result') {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m,
                  ),
                );
                if (resolvedSessionId && mode === 'agent') {
                  registry.complete(resolvedSessionId);
                }
                if (mode === 'chat') setLocalStreamingSessionId(null);
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; });
              } else if (event.type === 'error') {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: m.content + `\n\n**Error:** ${event.data}`,
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
                if (resolvedSessionId && mode === 'agent') {
                  registry.complete(resolvedSessionId);
                }
                if (mode === 'chat') setLocalStreamingSessionId(null);
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; });
              } else if (event.type === 'permission_request') {
                const permData: PermissionRequestData = {
                  requestId: event.requestId ?? '',
                  toolName: event.toolName ?? 'AskUserQuestion',
                  toolUseId: event.toolId ?? '',
                  input: event.toolArgs ?? {},
                  decisionReason: event.decisionReason,
                };
                // Only set pending permission if this is the active session
                if (sid === activeSessionIdRef.current || !activeSessionIdRef.current) {
                  setPendingPermission(permData);
                  permissionSessionRef.current = sid;
                }

                const questions = (permData.input.questions ?? []) as AskQuestionItem[];
                const questionContent = questions.length > 0
                  ? questions.map((q) => `${q.header ? `[${q.header}] ` : ''}${q.question}`).join('\n')
                  : String(permData.input.question || 'Agent asked a question');
                const questionMsg: ChatMessage = {
                  id: generateId(),
                  role: 'question',
                  content: questionContent,
                  timestamp: Date.now(),
                  questionData: questions,
                };
                updateMessagesForSession(sid, (prev) => [...prev, questionMsg]);
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        const sid = resolvedSessionId ?? `__pending_${assistantId}`;
        updateMessagesForSession(sid, (prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Error: ${error instanceof Error ? error.message : 'Connection failed'}`,
                  isStreaming: false,
                }
              : m,
          ),
        );
        if (resolvedSessionId && mode === 'agent') {
          registry.complete(resolvedSessionId);
        }
        if (mode === 'chat') setLocalStreamingSessionId(null);
        const cleanKey = resolvedSessionId ?? `__pending_${assistantId}`;
        setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(cleanKey); return n; });
      }
    },
    [mode, registry, updateMessagesForSession],
  );

  const loadSession = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (response.ok) {
        const { messages: loadedMessages } = await response.json();
        setMessagesMap((prev) => {
          const next = new Map(prev);
          const existing = prev.get(id);
          // Prefer in-memory messages if they have equal or more data
          // (background streaming may have richer state than server)
          if (!existing || existing.length < loadedMessages.length) {
            next.set(id, loadedMessages);
          }
          return next;
        });
        setActiveSessionId(id);
      }
    } catch {
      // ignore
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (!activeSessionId) return;
    if (mode === 'agent') {
      registry.abort(activeSessionId);
    }
    if (mode === 'chat') {
      setLocalStreamingSessionId(null);
    }
    setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(activeSessionId); return n; });
    updateMessagesForSession(activeSessionId, (prev) =>
      prev.map((m) => {
        if (!m.isStreaming) return m;
        return {
          ...m,
          isStreaming: false,
          toolCalls: (m.toolCalls ?? []).map((t) =>
            t.status === 'running'
              ? { ...t, status: 'error' as const, result: 'Cancelled' }
              : t,
          ),
        };
      }),
    );
  }, [activeSessionId, mode, registry, updateMessagesForSession]);

  const clearSession = useCallback(() => {
    if (activeSessionId) {
      if (mode === 'agent') {
        registry.abort(activeSessionId);
      }
      if (mode === 'chat' && localStreamingSessionId === activeSessionId) {
        setLocalStreamingSessionId(null);
      }
    }
    setMessagesMap((prev) => {
      if (!activeSessionId) return prev;
      const next = new Map(prev);
      next.delete(activeSessionId);
      return next;
    });
    setActiveSessionId(null);
    setPendingPermission(null);
    setStreamStartTimes((prev) => {
      if (!activeSessionId) return prev;
      const n = new Map(prev);
      n.delete(activeSessionId);
      return n;
    });
  }, [activeSessionId, mode, registry, localStreamingSessionId]);

  const submitPermissionDecision = useCallback(
    async (
      requestId: string,
      behavior: 'allow' | 'deny',
      updatedInput?: Record<string, unknown>,
    ) => {
      const sid = permissionSessionRef.current ?? activeSessionId;
      const answers = (updatedInput?.answers ?? {}) as Record<string, string>;
      const answerContent = behavior === 'allow'
        ? Object.values(answers).join(', ') || 'Approved'
        : 'Cancelled';
      const answerMsg: ChatMessage = {
        id: generateId(),
        role: 'answer',
        content: answerContent,
        timestamp: Date.now(),
        answerData: answers,
      };
      if (sid) {
        updateMessagesForSession(sid, (prev) => [...prev, answerMsg]);
      }
      setPendingPermission(null);
      permissionSessionRef.current = null;
      try {
        await fetch('/api/agent/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, behavior, updatedInput }),
        });
      } catch {
        // Connection error — permission may already be resolved
      }
    },
    [activeSessionId, updateMessagesForSession],
  );

  return {
    messages,
    isStreaming,
    sessionId: activeSessionId,
    streamStartTime,
    pendingPermission,
    sendMessage,
    loadSession,
    clearSession,
    stopStreaming,
    submitPermissionDecision,
  };
}
