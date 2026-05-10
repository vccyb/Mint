'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, Mode, StreamEventData, ToolCallInfo, SkillLoadInfo, Attachment, PermissionRequestData, TodoItem, TeammateState } from '@/types';
import { createDraftSessionKey, createInitialDraftSessionKey, isDraftSessionKey } from '@/lib/session-key';
import { generateId } from '@/lib/utils';
import type { StreamingRegistry } from '@/lib/streaming-registry';
import { handleStreamEvent, type StreamEventCallbacks } from '@/hooks/use-stream-events';

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
  sendMessage: (message: string, attachments?: Attachment[], mentionedTools?: unknown[], enableThinking?: boolean) => Promise<void>;
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
  teammates: TeammateState[];
  isWaitingResume: boolean;
  setProjectId: (projectId: string | null) => void;
}

export function useChatStream(mode: Mode, registry: StreamingRegistry, initialProjectId: string | null = null): UseChatStreamReturn {
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [activeSessionKey, setActiveSessionKey] = useState<string>(() => createInitialDraftSessionKey(mode));
  const [pendingPermissions, setPendingPermissions] = useState<Map<string, PermissionRequestData>>(new Map());
  const [permissionStates, setPermissionStates] = useState<Map<string, SessionPermissionState>>(new Map());
  const [localStreamingSessionIds, setLocalStreamingSessionIds] = useState<Set<string>>(new Set());
  const [streamStartTimes, setStreamStartTimes] = useState<Map<string, number>>(new Map());
  const [teammatesMap, setTeammatesMap] = useState<Map<string, TeammateState[]>>(new Map());
  const [waitingResumeMap, setWaitingResumeMap] = useState<Map<string, boolean>>(new Map());
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const activeSessionKeyRef = useRef<string>(activeSessionKey);
  activeSessionKeyRef.current = activeSessionKey;
  const messagesMapRef = useRef(messagesMap);
  messagesMapRef.current = messagesMap;
  const permissionStatesRef = useRef(permissionStates);
  permissionStatesRef.current = permissionStates;
  const projectIdRef = useRef<string | null>(projectId);
  projectIdRef.current = projectId;

  // ─── Session migration ───

  const migrateSessionState = useCallback((fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    setMessagesMap((prev) => { const source = prev.get(fromKey); if (!source) return prev; const next = new Map(prev); next.delete(fromKey); next.set(toKey, source); return next; });
    setStreamStartTimes((prev) => { const t = prev.get(fromKey); if (t === undefined) return prev; const next = new Map(prev); next.delete(fromKey); next.set(toKey, t); return next; });
    setPendingPermissions((prev) => { const p = prev.get(fromKey); if (!p) return prev; const next = new Map(prev); next.delete(fromKey); next.set(toKey, p); return next; });
    setPermissionStates((prev) => { const s = prev.get(fromKey); if (!s) return prev; const next = new Map(prev); next.delete(fromKey); next.set(toKey, s); return next; });
    setLocalStreamingSessionIds((prev) => { if (!prev.has(fromKey)) return prev; const next = new Set(prev); next.delete(fromKey); next.add(toKey); return next; });
    const controller = abortControllersRef.current.get(fromKey);
    if (controller) { abortControllersRef.current.delete(fromKey); abortControllersRef.current.set(toKey, controller); }
    setActiveSessionKey((prev) => (prev === fromKey ? toKey : prev));
  }, []);

  // ─── Derived values ───

  const sessionId = isDraftSessionKey(activeSessionKey) ? null : activeSessionKey;
  const messages = messagesMap.get(activeSessionKey) ?? [];
  const streamStartTime = streamStartTimes.get(activeSessionKey) ?? null;
  const permissionState = permissionStates.get(activeSessionKey) ?? { mode: 'default' as PermissionMode, lastNonPlanMode: 'default' as const };
  const permissionMode = permissionState.mode;
  const pendingPermission = pendingPermissions.get(activeSessionKey) ?? null;
  const isStreaming = localStreamingSessionIds.has(activeSessionKey) || (mode === 'agent' ? (registry.getStatus(activeSessionKey)?.isStreaming ?? false) : false);
  const teammates = teammatesMap.get(activeSessionKey) ?? [];
  const isWaitingResume = waitingResumeMap.get(activeSessionKey) ?? false;

  // ─── Helpers ───

  const updateMessagesForSession = useCallback(
    (sid: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesMap((prev) => { const next = new Map(prev); next.set(sid, updater(next.get(sid) ?? [])); return next; });
    }, [],
  );

  /** Build callbacks object for handleStreamEvent. */
  const buildCallbacks = useCallback((assistantId: string): StreamEventCallbacks => ({
    updateMessages: updateMessagesForSession,
    setPendingPermissions,
    setTeammatesMap,
    setWaitingResumeMap,
    registryComplete: (sid: string) => registry.complete(sid),
    removeAbortController: (sid: string) => { abortControllersRef.current.delete(sid); },
    removeStreamingId: (sid: string) => { setLocalStreamingSessionIds((prev) => { const next = new Set(prev); next.delete(sid); return next; }); },
    removeStreamStartTime: (sid: string) => { setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; }); },
  }), [updateMessagesForSession, registry]);

  /** Cleanup helpers for error/abort paths. */
  const cleanupSession = useCallback((sid: string, resolvedSessionId: string | null) => {
    if (resolvedSessionId && mode === 'agent') registry.complete(resolvedSessionId);
    abortControllersRef.current.delete(sid);
    setLocalStreamingSessionIds((prev) => { const next = new Set(prev); next.delete(sid); return next; });
    setStreamStartTimes((prev) => { const n = new Map(prev); n.delete(sid); return n; });
    setWaitingResumeMap((prev) => { const n = new Map(prev); n.delete(sid); return n; });
  }, [mode, registry]);

  /** Shared SSE stream processing loop. */
  const processSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantId: string,
    sid: string,
    onSessionResolved?: (sessionId: string) => void,
  ) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let resolvedSessionId: string | null = null;
    const cb = buildCallbacks(assistantId);

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
          try { event = JSON.parse(raw); } catch { continue; }

          // Resolve sessionId from server
          if (event.sessionId && !resolvedSessionId) {
            resolvedSessionId = event.sessionId;
            onSessionResolved?.(event.sessionId);
          }

          // Set isPlanMode on assistant message
          if (event.isPlanMode) {
            const planSid = resolvedSessionId ?? sid;
            updateMessagesForSession(planSid, (prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, isPlanMode: true } : m),
            );
          }

          const effectiveSid = resolvedSessionId ?? sid;
          handleStreamEvent(event, {
            sessionId: effectiveSid,
            assistantId,
            resolvedSessionId,
            mode,
          }, cb);
        }
      }
    }
  }, [buildCallbacks, mode, updateMessagesForSession]);

  // ─── Permission ───

  const setPermissionMode = useCallback((nextMode: PermissionMode) => {
    const sid = activeSessionKeyRef.current;
    setPermissionStates((prev) => {
      const next = new Map(prev);
      const current = next.get(sid) ?? { mode: 'default' as PermissionMode, lastNonPlanMode: 'default' as const };
      next.set(sid, { mode: nextMode, lastNonPlanMode: nextMode === 'plan' ? current.lastNonPlanMode : nextMode });
      return next;
    });
  }, []);

  const togglePlanMode = useCallback(() => {
    const sid = activeSessionKeyRef.current;
    setPermissionStates((prev) => {
      const next = new Map(prev);
      const current = next.get(sid) ?? { mode: 'default' as PermissionMode, lastNonPlanMode: 'default' as const };
      next.set(sid, { mode: current.mode === 'plan' ? current.lastNonPlanMode : 'plan', lastNonPlanMode: current.mode === 'plan' ? current.lastNonPlanMode : current.mode });
      return next;
    });
  }, []);

  // ─── sendMessage ───

  const sendMessage = useCallback(
    async (message: string, attachments?: Attachment[], mentionedTools?: unknown[], enableThinking?: boolean) => {
      if (mode === 'agent' && !registry.canStartNew()) return;

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: message, timestamp: Date.now(), attachments: attachments && attachments.length > 0 ? attachments : undefined };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, toolCalls: [] };

      const targetSessionKey = activeSessionKeyRef.current;
      updateMessagesForSession(targetSessionKey, (prev) => [...prev, userMsg, assistantMsg]);

      // Clear previous teammates
      setTeammatesMap((prev) => { const next = new Map(prev); next.delete(targetSessionKey); return next; });
      setWaitingResumeMap((prev) => { const next = new Map(prev); next.delete(targetSessionKey); return next; });

      const startTime = Date.now();
      setStreamStartTimes((prev) => new Map(prev).set(targetSessionKey, startTime));

      const endpoint = mode === 'chat' ? '/api/chat' : '/api/agent';
      const abortController = new AbortController();
      abortControllersRef.current.set(targetSessionKey, abortController);
      setLocalStreamingSessionIds((prev) => new Set(prev).add(targetSessionKey));

      const requestSessionId = isDraftSessionKey(targetSessionKey) ? undefined : targetSessionKey;
      const requestPermissionMode = permissionStatesRef.current.get(targetSessionKey)?.mode ?? 'default';
      let resolvedSessionId = requestSessionId ?? null;

      if (mode === 'agent' && resolvedSessionId) {
        registry.register(resolvedSessionId, mode, abortController);
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message, sessionId: requestSessionId, attachments, mentionedTools,
            ...(mode === 'chat' ? { enableThinking } : {}),
            ...(mode === 'agent' ? { permissionMode: requestPermissionMode, projectId: projectIdRef.current } : {}),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          const sid = resolvedSessionId ?? targetSessionKey;
          updateMessagesForSession(sid, (prev) =>
            prev.map((m) => m.id === assistantId
              ? { ...m, errorInfo: { code: 'INTERNAL_ERROR' as const, message: errorData.error ?? 'Unknown error' }, isStreaming: false }
              : m),
          );
          cleanupSession(sid, resolvedSessionId);
          return;
        }

        await processSSEStream(response.body!.getReader(), assistantId, targetSessionKey, (newSid) => {
          resolvedSessionId = newSid;
          migrateSessionState(targetSessionKey, newSid);
          if (mode === 'agent') registry.register(newSid, mode, abortController);

          // Update session title if this is a new session with first message
          const currentMessages = messagesMapRef.current.get(targetSessionKey) ?? [];
          if (currentMessages.length <= 2) {  // user + assistant
            const userMsg = currentMessages.find(m => m.role === 'user');
            if (userMsg && userMsg.content) {
              const newTitle = userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? '...' : '');
              fetch(`/api/sessions/${newSid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
              }).catch(() => {
                // Ignore title update errors
              });
            }
          }
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        const sid = resolvedSessionId ?? targetSessionKey;
        updateMessagesForSession(sid, (prev) =>
          prev.map((m) => m.id === assistantId
            ? { ...m, errorInfo: { code: 'NETWORK_ERROR' as const, message: error instanceof Error ? error.message : 'Connection failed' }, isStreaming: false }
            : m),
        );
        cleanupSession(sid, resolvedSessionId);
      }
    },
    [mode, registry, updateMessagesForSession, migrateSessionState, cleanupSession, processSSEStream],
  );

  // ─── loadSession / clearSession / stopStreaming ───

  const loadSession = useCallback(async (id: string) => {
    // Immediately switch to the target session and clear messages to avoid flash
    setActiveSessionKey(id);
    setMessagesMap((prev) => {
      const next = new Map(prev);
      if (!next.has(id)) next.set(id, []);
      return next;
    });
    try {
      const response = await fetch(`/api/sessions/${id}`);
      if (response.ok) {
        const { messages: loadedMessages } = await response.json();
        setMessagesMap((prev) => {
          const next = new Map(prev);
          const existing = prev.get(id);
          if (!existing || existing.length < loadedMessages.length) next.set(id, loadedMessages);
          return next;
        });
      }
    } catch { /* ignore */ }
  }, []);

  const stopStreaming = useCallback(() => {
    const target = activeSessionKeyRef.current;
    const ac = abortControllersRef.current.get(target);
    if (ac) { ac.abort(); abortControllersRef.current.delete(target); }
    if (!isDraftSessionKey(target) && mode === 'agent') registry.abort(target);
    cleanupSession(target, isDraftSessionKey(target) ? null : target);
    updateMessagesForSession(target, (prev) =>
      prev.map((m) => {
        if (!m.isStreaming) return m;
        return { ...m, isStreaming: false, toolCalls: (m.toolCalls ?? []).map((t) => t.status === 'running' ? { ...t, status: 'error' as const, result: 'Cancelled' } : t) };
      }),
    );
  }, [mode, registry, cleanupSession, updateMessagesForSession]);

  const clearSession = useCallback(() => {
    const current = activeSessionKeyRef.current;
    const nextDraftKey = createDraftSessionKey(mode);
    if (isDraftSessionKey(current) && (messagesMap.get(current)?.length ?? 0) === 0) {
      setPermissionStates((prev) => { if (!prev.has(current)) return prev; const next = new Map(prev); next.delete(current); return next; });
      setPendingPermissions((prev) => { if (!prev.has(current)) return prev; const next = new Map(prev); next.delete(current); return next; });
    }
    setActiveSessionKey(nextDraftKey);
  }, [messagesMap, mode]);

  // ─── submitPermissionDecision ───

  const submitPermissionDecision = useCallback(
    async (requestId: string, behavior: 'allow' | 'deny', updatedInput?: Record<string, unknown>) => {
      const sid = activeSessionKeyRef.current;
      const pending = pendingPermissions.get(sid);
      setPendingPermissions((prev) => { const next = new Map(prev); next.delete(sid); return next; });

      if (!pending || pending.toolName !== 'AskUserQuestion') {
        const answers = (updatedInput?.answers ?? {}) as Record<string, string>;
        const answerMsg: ChatMessage = {
          id: generateId(), role: 'answer',
          content: behavior === 'allow' ? Object.values(answers).join(', ') || 'Approved' : 'Cancelled',
          timestamp: Date.now(), answerData: answers,
        };
        updateMessagesForSession(sid, (prev) => [...prev, answerMsg]);
      }
      try {
        await fetch('/api/agent/answer', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, behavior, updatedInput }),
        });
      } catch { /* connection error — permission may already be resolved */ }
    },
    [updateMessagesForSession, pendingPermissions],
  );

  // ─── approvePlan ───

  const approvePlan = useCallback(
    async (approvalMode: 'auto' | 'manual') => {
      const activeId = activeSessionKeyRef.current;
      if (isDraftSessionKey(activeId)) return;

      const currentMessages = messagesMapRef.current.get(activeId) ?? [];
      const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg) return;

      const permMode = approvalMode === 'auto' ? 'bypassPermissions' : 'default';
      const newAssistantId = generateId();
      const assistantMsg: ChatMessage = { id: newAssistantId, role: 'assistant', content: '', timestamp: Date.now(), isStreaming: true, toolCalls: [] };

      setStreamStartTimes((prev) => new Map(prev).set(activeId, Date.now()));
      updateMessagesForSession(activeId, (prev) => [...prev, assistantMsg]);

      const abortController = new AbortController();
      abortControllersRef.current.set(activeId, abortController);
      setLocalStreamingSessionIds((prev) => new Set(prev).add(activeId));
      registry.register(activeId, mode, abortController);

      try {
        const response = await fetch('/api/agent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: lastUserMsg.content, sessionId: activeId, permissionMode: permMode, planApproval: true }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          updateMessagesForSession(activeId, (prev) =>
            prev.map((m) => m.id === newAssistantId
              ? { ...m, errorInfo: { code: 'INTERNAL_ERROR' as const, message: 'Failed to execute plan' }, isStreaming: false }
              : m),
          );
          cleanupSession(activeId, activeId);
          return;
        }

        await processSSEStream(response.body!.getReader(), newAssistantId, activeId);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        updateMessagesForSession(activeId, (prev) =>
          prev.map((m) => m.id === newAssistantId
            ? { ...m, errorInfo: { code: 'NETWORK_ERROR' as const, message: error instanceof Error ? error.message : 'Execution failed' }, isStreaming: false }
            : m),
        );
        cleanupSession(activeId, activeId);
      }
    },
    [mode, registry, updateMessagesForSession, cleanupSession, processSSEStream],
  );

  return {
    messages, isStreaming, sessionKey: activeSessionKey, sessionId, streamStartTime,
    pendingPermission, permissionMode, sendMessage, loadSession, clearSession,
    stopStreaming, setPermissionMode, togglePlanMode, submitPermissionDecision,
    approvePlan, teammates, isWaitingResume, setProjectId,
  };
}
