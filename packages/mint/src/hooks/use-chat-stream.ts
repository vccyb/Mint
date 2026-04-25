'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, Mode, StreamEventData, ToolCallInfo, SkillLoadInfo, Attachment, PermissionRequestData, AskQuestionItem, MentionChip, TodoItem, Team } from '@/types';
import { createDraftSessionKey, createInitialDraftSessionKey, isDraftSessionKey } from '@/lib/session-key';
import { generateId } from '@/lib/utils';
import type { StreamingRegistry } from '@/lib/streaming-registry';

type PermissionMode = 'bypassPermissions' | 'default' | 'plan';

interface SessionPermissionState {
  mode: PermissionMode;
  lastNonPlanMode: Exclude<PermissionMode, 'plan'>;
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionKey: string;
  sessionId: string | null;
  streamStartTime: number | null;
  pendingPermission: PermissionRequestData | null;
  permissionMode: PermissionMode;
  sendMessage: (message: string, attachments?: Attachment[], mentionedTools?: MentionChip[]) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  clearSession: () => void;
  stopStreaming: () => void;
  setPermissionMode: (mode: PermissionMode) => void;
  togglePlanMode: () => void;
  submitPermissionDecision: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => Promise<void>;
  approvePlan: (mode: 'auto' | 'manual') => Promise<void>;
  team: Team | null;
}

export function useChatStream(mode: Mode, registry: StreamingRegistry): UseChatStreamReturn {
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [activeSessionKey, setActiveSessionKey] = useState<string>(() => createInitialDraftSessionKey(mode));
  const [pendingPermissions, setPendingPermissions] = useState<Map<string, PermissionRequestData>>(
    new Map(),
  );
  const [permissionStates, setPermissionStates] = useState<Map<string, SessionPermissionState>>(
    new Map(),
  );
  const [localStreamingSessionIds, setLocalStreamingSessionIds] = useState<Set<string>>(new Set());
  const [streamStartTimes, setStreamStartTimes] = useState<Map<string, number>>(new Map());
  const [teamMap, setTeamMap] = useState<Map<string, Team | null>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const activeSessionKeyRef = useRef<string>(activeSessionKey);
  activeSessionKeyRef.current = activeSessionKey;
  const messagesMapRef = useRef(messagesMap);
  messagesMapRef.current = messagesMap;
  const permissionStatesRef = useRef(permissionStates);
  permissionStatesRef.current = permissionStates;

  const migrateSessionState = useCallback((fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;

    setMessagesMap((prev) => {
      const source = prev.get(fromKey);
      if (!source) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, source);
      return next;
    });

    setStreamStartTimes((prev) => {
      const startTime = prev.get(fromKey);
      if (startTime === undefined) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, startTime);
      return next;
    });

    setPendingPermissions((prev) => {
      const pending = prev.get(fromKey);
      if (!pending) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, pending);
      return next;
    });

    setPermissionStates((prev) => {
      const state = prev.get(fromKey);
      if (!state) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, state);
      return next;
    });

    setLocalStreamingSessionIds((prev) => {
      if (!prev.has(fromKey)) return prev;
      const next = new Set(prev);
      next.delete(fromKey);
      next.add(toKey);
      return next;
    });

    const controller = abortControllersRef.current.get(fromKey);
    if (controller) {
      abortControllersRef.current.delete(fromKey);
      abortControllersRef.current.set(toKey, controller);
    }

    setActiveSessionKey((prev) => (prev === fromKey ? toKey : prev));
  }, []);

  // Derived values
  const sessionId = isDraftSessionKey(activeSessionKey) ? null : activeSessionKey;
  const messages = messagesMap.get(activeSessionKey) ?? [];
  const streamStartTime = streamStartTimes.get(activeSessionKey) ?? null;
  const permissionState = permissionStates.get(activeSessionKey) ?? {
    mode: 'default' as PermissionMode,
    lastNonPlanMode: 'default' as const,
  };
  const permissionMode = permissionState.mode;
  const pendingPermission = pendingPermissions.get(activeSessionKey) ?? null;
  const isStreaming =
    localStreamingSessionIds.has(activeSessionKey) ||
    (mode === 'agent' ? (registry.getStatus(activeSessionKey)?.isStreaming ?? false) : false);
  const team = teamMap.get(activeSessionKey) ?? null;

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

  const setPermissionMode = useCallback((nextMode: PermissionMode) => {
    const sid = activeSessionKeyRef.current;
    setPermissionStates((prev) => {
      const next = new Map(prev);
      const current = next.get(sid) ?? { mode: 'default' as PermissionMode, lastNonPlanMode: 'default' as const };
      next.set(sid, {
        mode: nextMode,
        lastNonPlanMode: nextMode === 'plan' ? current.lastNonPlanMode : nextMode,
      });
      return next;
    });
  }, []);

  const togglePlanMode = useCallback(() => {
    const sid = activeSessionKeyRef.current;
    setPermissionStates((prev) => {
      const next = new Map(prev);
      const current = next.get(sid) ?? { mode: 'default' as PermissionMode, lastNonPlanMode: 'default' as const };
      next.set(sid, {
        mode: current.mode === 'plan' ? current.lastNonPlanMode : 'plan',
        lastNonPlanMode: current.mode === 'plan' ? current.lastNonPlanMode : current.mode,
      });
      return next;
    });
  }, []);

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

      const targetSessionKey = activeSessionKeyRef.current;
      updateMessagesForSession(targetSessionKey, (prev) => [...prev, userMsg, assistantMsg]);

      const startTime = Date.now();
      setStreamStartTimes((prev) => new Map(prev).set(targetSessionKey, startTime));

      const endpoint = mode === 'chat' ? '/api/chat' : '/api/agent';
      const abortController = new AbortController();
      abortControllersRef.current.set(targetSessionKey, abortController);
      setLocalStreamingSessionIds((prev) => new Set(prev).add(targetSessionKey));

      const requestSessionId = isDraftSessionKey(targetSessionKey) ? undefined : targetSessionKey;
      const requestPermissionMode =
        permissionStatesRef.current.get(targetSessionKey)?.mode ?? 'default';
      let resolvedSessionId = requestSessionId ?? null;

      // Register with streaming registry immediately for existing sessions
      // (new sessions are registered when sessionId is resolved from server)
      if (mode === 'agent' && resolvedSessionId) {
        registry.register(resolvedSessionId, mode, abortController);
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: requestSessionId,
            attachments,
            mentionedTools,
            ...(mode === 'agent' ? { permissionMode: requestPermissionMode } : {}),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          const sid = resolvedSessionId ?? targetSessionKey;
          updateMessagesForSession(sid, (prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, errorInfo: { code: 'INTERNAL_ERROR' as const, message: errorData.error ?? 'Unknown error' }, isStreaming: false }
                : m,
            ),
          );
          if (resolvedSessionId && mode === 'agent') {
            registry.complete(resolvedSessionId);
          }
          abortControllersRef.current.delete(sid);
          setLocalStreamingSessionIds((prev) => {
            const next = new Set(prev);
            next.delete(sid);
            return next;
          });
          const cleanKey = resolvedSessionId ?? targetSessionKey;
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
                migrateSessionState(targetSessionKey, event.sessionId);

                // Register with registry now that we have a sessionId
                if (mode === 'agent') {
                  registry.register(event.sessionId, mode, abortController);
                }
              }

              // Set isPlanMode on assistant message — must be outside the
              // !resolvedSessionId gate so it works for existing sessions too.
              if (event.isPlanMode && assistantId) {
                const planSid = resolvedSessionId ?? event.sessionId ?? targetSessionKey;
                if (planSid) {
                  updateMessagesForSession(planSid, (prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, isPlanMode: true }
                        : m,
                    ),
                  );
                }
              }

              const sid = resolvedSessionId ?? targetSessionKey;

              if (event.type === 'content' && event.data) {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.data }
                      : m,
                  ),
                );
              } else if (event.type === 'thinking' && event.thinkingDelta) {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, thinkingContent: (m.thinkingContent ?? '') + event.thinkingDelta }
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
                abortControllersRef.current.delete(sid);
                setLocalStreamingSessionIds((prev) => {
                  const next = new Set(prev);
                  next.delete(sid);
                  return next;
                });
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; });
              } else if (event.type === 'error') {
                updateMessagesForSession(sid, (prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          errorInfo: {
                            code: event.errorCode ?? 'INTERNAL_ERROR',
                            message: event.data ?? 'Unknown error',
                          },
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
                if (resolvedSessionId && mode === 'agent') {
                  registry.complete(resolvedSessionId);
                }
                abortControllersRef.current.delete(sid);
                setLocalStreamingSessionIds((prev) => {
                  const next = new Set(prev);
                  next.delete(sid);
                  return next;
                });
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; });
              } else if (event.type === 'permission_request') {
                const permData: PermissionRequestData = {
                  requestId: event.requestId ?? '',
                  toolName: event.toolName ?? 'AskUserQuestion',
                  toolUseId: event.toolId ?? '',
                  input: event.toolArgs ?? {},
                  decisionReason: event.decisionReason,
                };
                setPendingPermissions((prev) => new Map(prev).set(sid, permData));

                // Only create inline question message for non-AskUserQuestion tools
                if (permData.toolName !== 'AskUserQuestion') {
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
              } else if (event.type === 'team_created' && event.team) {
                setTeamMap((prev) => new Map(prev).set(sid, event.team ?? null));
              } else if (event.type === 'agent_status' && event.agentId && event.agentStatus) {
                setTeamMap((prev) => {
                  const current = prev.get(sid);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    agents: current.agents.map((a) =>
                      a.id === event.agentId ? { ...a, status: event.agentStatus! } : a,
                    ),
                  };
                  return new Map(prev).set(sid, updated);
                });
              } else if (event.type === 'mailbox_message' && event.mailboxMessage) {
                setTeamMap((prev) => {
                  const current = prev.get(sid);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    mailbox: [...current.mailbox, event.mailboxMessage!],
                  };
                  return new Map(prev).set(sid, updated);
                });
              } else if (event.type === 'task_update' && event.task) {
                setTeamMap((prev) => {
                  const current = prev.get(sid);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    tasks: current.tasks.map((t) =>
                      t.id === event.task!.id ? event.task! : t,
                    ),
                  };
                  return new Map(prev).set(sid, updated);
                });
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        const sid = resolvedSessionId ?? targetSessionKey;
        updateMessagesForSession(sid, (prev) =>
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
        if (resolvedSessionId && mode === 'agent') {
          registry.complete(resolvedSessionId);
        }
        abortControllersRef.current.delete(sid);
        setLocalStreamingSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sid);
          return next;
        });
        const cleanKey = resolvedSessionId ?? targetSessionKey;
        setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(cleanKey); return n; });
      }
    },
    [mode, registry, updateMessagesForSession, migrateSessionState],
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
        setActiveSessionKey(id);
      }
    } catch {
      // ignore
    }
  }, []);

  const stopStreaming = useCallback(() => {
    const targetSessionKey = activeSessionKeyRef.current;
    const abortController = abortControllersRef.current.get(targetSessionKey);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(targetSessionKey);
    }
    if (!isDraftSessionKey(targetSessionKey) && mode === 'agent') {
      registry.abort(targetSessionKey);
    }
    setLocalStreamingSessionIds((prev) => {
      const next = new Set(prev);
      next.delete(targetSessionKey);
      return next;
    });
    setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(targetSessionKey); return n; });
    updateMessagesForSession(targetSessionKey, (prev) =>
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
  }, [mode, registry, updateMessagesForSession]);

  const clearSession = useCallback(() => {
    const currentSessionKey = activeSessionKeyRef.current;
    const nextDraftKey = createDraftSessionKey(mode);

    if (isDraftSessionKey(currentSessionKey) && (messagesMap.get(currentSessionKey)?.length ?? 0) === 0) {
      setPermissionStates((prev) => {
        if (!prev.has(currentSessionKey)) return prev;
        const next = new Map(prev);
        next.delete(currentSessionKey);
        return next;
      });
      setPendingPermissions((prev) => {
        if (!prev.has(currentSessionKey)) return prev;
        const next = new Map(prev);
        next.delete(currentSessionKey);
        return next;
      });
    }

    setActiveSessionKey(nextDraftKey);
  }, [messagesMap, mode]);

  const submitPermissionDecision = useCallback(
    async (
      requestId: string,
      behavior: 'allow' | 'deny',
      updatedInput?: Record<string, unknown>,
    ) => {
      const sid = activeSessionKeyRef.current;
      const pending = pendingPermissions.get(sid);
      setPendingPermissions((prev) => {
        const next = new Map(prev);
        next.delete(sid);
        return next;
      });

      // Only create inline answer message for non-AskUserQuestion tools
      if (!pending || pending.toolName !== 'AskUserQuestion') {
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
        updateMessagesForSession(sid, (prev) => [...prev, answerMsg]);
      }
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
    [updateMessagesForSession, pendingPermissions],
  );

  const approvePlan = useCallback(
    async (approvalMode: 'auto' | 'manual') => {
      const activeKey = activeSessionKeyRef.current;
      if (isDraftSessionKey(activeKey)) return;
      const activeId = activeKey;
      const currentMessages = messagesMapRef.current.get(activeId) ?? [];
      // Find the last user message to re-send
      const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg) return;

      const permMode = approvalMode === 'auto' ? 'bypassPermissions' : 'default';

      // Create a new assistant message placeholder
      const newAssistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: newAssistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      };

      const startTime = Date.now();
      setStreamStartTimes((prev) => new Map(prev).set(activeId, startTime));
      updateMessagesForSession(activeId, (prev) => [...prev, assistantMsg]);

      const abortController = new AbortController();
      abortControllersRef.current.set(activeId, abortController);
      setLocalStreamingSessionIds((prev) => new Set(prev).add(activeId));
      registry.register(activeId, mode, abortController);

      try {
        const response = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: lastUserMsg.content,
            sessionId: activeId,
            permissionMode: permMode,
            planApproval: true,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          updateMessagesForSession(activeId, (prev) =>
            prev.map((m) =>
              m.id === newAssistantId
                ? { ...m, errorInfo: { code: 'INTERNAL_ERROR' as const, message: 'Failed to execute plan' }, isStreaming: false }
                : m,
            ),
          );
          abortControllersRef.current.delete(activeId);
          setLocalStreamingSessionIds((prev) => {
            const next = new Set(prev);
            next.delete(activeId);
            return next;
          });
          registry.complete(activeId);
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

              if (event.type === 'content' && event.data) {
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? { ...m, content: m.content + event.data }
                      : m,
                  ),
                );
              } else if (event.type === 'thinking' && event.thinkingDelta) {
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? { ...m, thinkingContent: (m.thinkingContent ?? '') + event.thinkingDelta }
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
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? { ...m, toolCalls: [...(m.toolCalls ?? []), toolInfo] }
                      : m,
                  ),
                );
              } else if (event.type === 'todo_update') {
                const todos = (event.todos ?? []) as TodoItem[];
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? { ...m, todos }
                      : m,
                  ),
                );
              } else if (event.type === 'tool_result') {
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls ?? []).map((t) =>
                            t.id === event.toolId
                              ? { ...t, result: event.data, status: 'completed' as const, completedAt: Date.now() }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
              } else if (event.type === 'result') {
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId ? { ...m, isStreaming: false } : m,
                  ),
                );
                abortControllersRef.current.delete(activeId);
                setLocalStreamingSessionIds((prev) => {
                  const next = new Set(prev);
                  next.delete(activeId);
                  return next;
                });
                registry.complete(activeId);
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(activeId); return n; });
              } else if (event.type === 'error') {
                updateMessagesForSession(activeId, (prev) =>
                  prev.map((m) =>
                    m.id === newAssistantId
                      ? {
                          ...m,
                          errorInfo: {
                            code: event.errorCode ?? 'INTERNAL_ERROR',
                            message: event.data ?? 'Unknown error',
                          },
                          isStreaming: false,
                        }
                      : m,
                  ),
                );
                abortControllersRef.current.delete(activeId);
                setLocalStreamingSessionIds((prev) => {
                  const next = new Set(prev);
                  next.delete(activeId);
                  return next;
                });
                registry.complete(activeId);
                setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(activeId); return n; });
              } else if (event.type === 'permission_request') {
                const permData: PermissionRequestData = {
                  requestId: event.requestId ?? '',
                  toolName: event.toolName ?? 'AskUserQuestion',
                  toolUseId: event.toolId ?? '',
                  input: event.toolArgs ?? {},
                  decisionReason: event.decisionReason,
                };
                setPendingPermissions((prev) => new Map(prev).set(activeId, permData));
              } else if (event.type === 'team_created' && event.team) {
                setTeamMap((prev) => new Map(prev).set(activeId, event.team ?? null));
              } else if (event.type === 'agent_status' && event.agentId && event.agentStatus) {
                setTeamMap((prev) => {
                  const current = prev.get(activeId);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    agents: current.agents.map((a) =>
                      a.id === event.agentId ? { ...a, status: event.agentStatus! } : a,
                    ),
                  };
                  return new Map(prev).set(activeId, updated);
                });
              } else if (event.type === 'mailbox_message' && event.mailboxMessage) {
                setTeamMap((prev) => {
                  const current = prev.get(activeId);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    mailbox: [...current.mailbox, event.mailboxMessage!],
                  };
                  return new Map(prev).set(activeId, updated);
                });
              } else if (event.type === 'task_update' && event.task) {
                setTeamMap((prev) => {
                  const current = prev.get(activeId);
                  if (!current) return prev;
                  const updated: Team = {
                    ...current,
                    tasks: current.tasks.map((t) =>
                      t.id === event.task!.id ? event.task! : t,
                    ),
                  };
                  return new Map(prev).set(activeId, updated);
                });
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        updateMessagesForSession(activeId, (prev) =>
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
        abortControllersRef.current.delete(activeId);
        setLocalStreamingSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(activeId);
          return next;
        });
        registry.complete(activeId);
        setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(activeId); return n; });
      }
    },
    [mode, registry, updateMessagesForSession],
  );

  return {
    messages,
    isStreaming,
    sessionKey: activeSessionKey,
    sessionId,
    streamStartTime,
    pendingPermission,
    permissionMode,
    sendMessage,
    loadSession,
    clearSession,
    stopStreaming,
    setPermissionMode,
    togglePlanMode,
    submitPermissionDecision,
    approvePlan,
    team,
  };
}
