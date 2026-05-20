
import { useState, useCallback, useRef } from 'react';
import type {
  ChatMessage,
  Mode,
  PermissionRequestData,
  TeammateState,
} from '@/types';
import {
  createDraftSessionKey,
  createInitialDraftSessionKey,
  isDraftSessionKey,
} from '@/lib/session-key';
import type { StreamingRegistry } from '@/lib/streaming-registry';
import { useSessionOperations } from './use-session-operations';

export type PermissionMode = 'bypassPermissions' | 'default' | 'plan';

export interface SessionPermissionState {
  mode: PermissionMode;
  lastNonPlanMode: Exclude<PermissionMode, 'plan'>;
}

export interface SessionStateReturn {
  // State
  messagesMap: Map<string, ChatMessage[]>;
  activeSessionKey: string;
  pendingPermissions: Map<string, PermissionRequestData>;
  permissionStates: Map<string, SessionPermissionState>;
  localStreamingSessionIds: Set<string>;
  streamStartTimes: Map<string, number>;
  teammatesMap: Map<string, TeammateState[]>;
  waitingResumeMap: Map<string, boolean>;
  projectId: string | null;
  abortControllersRef: React.MutableRefObject<Map<string, AbortController>>;
  // Token tracking state
  inputTokensMap: Map<string, number>;
  contextWindowMap: Map<string, number>;
  compactingMap: Map<string, boolean>;

  // Refs
  activeSessionKeyRef: React.MutableRefObject<string>;
  messagesMapRef: React.MutableRefObject<Map<string, ChatMessage[]>>;
  permissionStatesRef: React.MutableRefObject<Map<string, SessionPermissionState>>;
  projectIdRef: React.MutableRefObject<string | null>;

  // State setters (exposed for use-sse-stream)
  setMessagesMap: React.Dispatch<React.SetStateAction<Map<string, ChatMessage[]>>>;
  setPendingPermissions: React.Dispatch<React.SetStateAction<Map<string, PermissionRequestData>>>;
  setPermissionStates: React.Dispatch<React.SetStateAction<Map<string, SessionPermissionState>>>;
  setLocalStreamingSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setStreamStartTimes: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setTeammatesMap: React.Dispatch<React.SetStateAction<Map<string, TeammateState[]>>>;
  setWaitingResumeMap: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  setProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveSessionKey: React.Dispatch<React.SetStateAction<string>>;
  setInputTokensMap: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setContextWindowMap: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setCompactingMap: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;

  // Derived values
  sessionId: string | null;
  messages: ChatMessage[];
  streamStartTime: number | null;
  permissionMode: PermissionMode;
  pendingPermission: PermissionRequestData | null;
  isStreaming: boolean;
  teammates: TeammateState[];
  isWaitingResume: boolean;
  inputTokens: number;
  contextWindow: number;
  isCompacting: boolean;

  // Methods
  updateMessagesForSession: (
    sid: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) => void;
  migrateSessionState: (fromKey: string, toKey: string) => void;
  setPermissionMode: (nextMode: PermissionMode) => void;
  togglePlanMode: () => void;
  loadSession: (id: string) => Promise<void>;
  clearSession: () => void;
  stopStreaming: () => void;
  forkFromMessage: (messageId: string) => Promise<void>;
}

export function useSessionState(
  mode: Mode,
  registry: StreamingRegistry,
  initialProjectId: string | null = null,
): SessionStateReturn {
  const [messagesMap, setMessagesMap] = useState<Map<string, ChatMessage[]>>(new Map());
  const [activeSessionKey, setActiveSessionKey] = useState<string>(() =>
    createInitialDraftSessionKey(mode),
  );
  const [pendingPermissions, setPendingPermissions] = useState<Map<string, PermissionRequestData>>(
    new Map(),
  );
  const [permissionStates, setPermissionStates] = useState<Map<string, SessionPermissionState>>(
    new Map(),
  );
  const [localStreamingSessionIds, setLocalStreamingSessionIds] = useState<Set<string>>(new Set());
  const [streamStartTimes, setStreamStartTimes] = useState<Map<string, number>>(new Map());
  const [teammatesMap, setTeammatesMap] = useState<Map<string, TeammateState[]>>(new Map());
  const [waitingResumeMap, setWaitingResumeMap] = useState<Map<string, boolean>>(new Map());
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const [inputTokensMap, setInputTokensMap] = useState<Map<string, number>>(new Map());
  const [contextWindowMap, setContextWindowMap] = useState<Map<string, number>>(new Map());
  const [compactingMap, setCompactingMap] = useState<Map<string, boolean>>(new Map());

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
    setMessagesMap((prev) => {
      const source = prev.get(fromKey);
      if (!source) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, source);
      return next;
    });
    setStreamStartTimes((prev) => {
      const t = prev.get(fromKey);
      if (t === undefined) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, t);
      return next;
    });
    setPendingPermissions((prev) => {
      const p = prev.get(fromKey);
      if (!p) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, p);
      return next;
    });
    setPermissionStates((prev) => {
      const s = prev.get(fromKey);
      if (!s) return prev;
      const next = new Map(prev);
      next.delete(fromKey);
      next.set(toKey, s);
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

  // ─── Derived values ───

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
  const teammates = teammatesMap.get(activeSessionKey) ?? [];
  const isWaitingResume = waitingResumeMap.get(activeSessionKey) ?? false;
  const inputTokens = inputTokensMap.get(activeSessionKey) ?? 0;
  const contextWindow = contextWindowMap.get(activeSessionKey) ?? 200_000;
  const isCompacting = compactingMap.get(activeSessionKey) ?? false;

  // ─── Helpers ───

  const updateMessagesForSession = useCallback(
    (sid: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesMap((prev) => {
        const next = new Map(prev);
        next.set(sid, updater(next.get(sid) ?? []));
        return next;
      });
    },
    [],
  );

  // ─── Permission ───

  const setPermissionMode = useCallback((nextMode: PermissionMode) => {
    const sid = activeSessionKeyRef.current;
    setPermissionStates((prev) => {
      const next = new Map(prev);
      const current = next.get(sid) ?? {
        mode: 'default' as PermissionMode,
        lastNonPlanMode: 'default' as const,
      };
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
      const current = next.get(sid) ?? {
        mode: 'default' as PermissionMode,
        lastNonPlanMode: 'default' as const,
      };
      next.set(sid, {
        mode: current.mode === 'plan' ? current.lastNonPlanMode : 'plan',
        lastNonPlanMode: current.mode === 'plan' ? current.lastNonPlanMode : current.mode,
      });
      return next;
    });
  }, []);

  // ─── Session operations (extracted) ───

  const ops = useSessionOperations({
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
  });

  return {
    messagesMap,
    activeSessionKey,
    pendingPermissions,
    permissionStates,
    localStreamingSessionIds,
    streamStartTimes,
    teammatesMap,
    waitingResumeMap,
    projectId,
    abortControllersRef,
    inputTokensMap,
    contextWindowMap,
    compactingMap,
    activeSessionKeyRef,
    messagesMapRef,
    permissionStatesRef,
    projectIdRef,
    setMessagesMap,
    setPendingPermissions,
    setPermissionStates,
    setLocalStreamingSessionIds,
    setStreamStartTimes,
    setTeammatesMap,
    setWaitingResumeMap,
    setProjectId,
    setActiveSessionKey,
    setInputTokensMap,
    setContextWindowMap,
    setCompactingMap,
    sessionId,
    messages,
    streamStartTime,
    permissionMode,
    pendingPermission,
    isStreaming,
    teammates,
    isWaitingResume,
    inputTokens,
    contextWindow,
    isCompacting,
    updateMessagesForSession,
    migrateSessionState,
    setPermissionMode,
    togglePlanMode,
    loadSession: ops.loadSession,
    clearSession: ops.clearSession,
    stopStreaming: ops.stopStreaming,
    forkFromMessage: ops.forkFromMessage,
  };
}
