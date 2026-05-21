
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, Mode, Attachment } from '@/types';
import { generateId } from '@/lib/utils';
import type { StreamingRegistry } from '@/lib/streaming-registry';
import { useSessionState, type PermissionMode } from './use-session-state';
import { useSSEStream } from './use-sse-stream';
import { useChatActions } from './use-chat-actions';

interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionKey: string;
  sessionId: string | null;
  streamStartTime: number | null;
  pendingPermission: import('@/types').PermissionRequestData | null;
  permissionMode: PermissionMode;
  sendMessage: (
    message: string,
    attachments?: Attachment[],
    mentionedTools?: unknown[],
    enableThinking?: boolean,
  ) => Promise<void>;
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
  teammates: import('@/types').TeammateState[];
  isWaitingResume: boolean;
  setProjectId: (projectId: string | null) => void;
  inputTokens: number;
  contextWindow: number;
  isCompacting: boolean;
  forkFromMessage: (messageId: string) => Promise<void>;
  suggestions: string[];
}

export function useChatStream(
  mode: Mode,
  registry: StreamingRegistry,
  initialProjectId: string | null = null,
): UseChatStreamReturn {
  const state = useSessionState(mode, registry, initialProjectId);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const prevStreamingRef = useRef(false);

  const sseStream = useSSEStream({
    mode,
    registry,
    updateMessagesForSession: state.updateMessagesForSession,
    abortControllersRef: state.abortControllersRef,
    setPendingPermissions: state.setPendingPermissions,
    setTeammatesMap: state.setTeammatesMap,
    setWaitingResumeMap: state.setWaitingResumeMap,
    setLocalStreamingSessionIds: state.setLocalStreamingSessionIds,
    setStreamStartTimes: state.setStreamStartTimes,
    setInputTokensMap: state.setInputTokensMap,
    setContextWindowMap: state.setContextWindowMap,
    setCompactingMap: state.setCompactingMap,
  });

  const actions = useChatActions({ mode, registry, state, sseStream });

  // Generate AI-powered suggestions after streaming ends
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = state.isStreaming;

    if (wasStreaming && !state.isStreaming) {
      // Streaming just ended — find the last assistant message
      const msgs = state.messages;
      const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant' && !m.isStreaming && !m.errorInfo && !m.isPlanMode && m.content);
      if (lastAssistant?.content) {
        window.electronAPI.generateSuggestions(lastAssistant.content)
          .then((result: unknown) => {
            const arr = Array.isArray(result) ? result.map(String) : [];
            setSuggestions(arr);
          })
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
      }
    }
  }, [state.isStreaming, state.messages]);

  // Clear suggestions when a new message is sent (streaming starts)
  useEffect(() => {
    if (state.isStreaming) {
      setSuggestions([]);
    }
  }, [state.isStreaming]);

  // ─── submitPermissionDecision ───

  const submitPermissionDecision = useCallback(
    async (
      requestId: string,
      behavior: 'allow' | 'deny',
      updatedInput?: Record<string, unknown>,
    ) => {
      const sid = state.activeSessionKeyRef.current;
      const pending = state.pendingPermissions.get(sid);
      state.setPendingPermissions((prev) => {
        const next = new Map(prev);
        next.delete(sid);
        return next;
      });

      if (!pending || pending.toolName !== 'AskUserQuestion') {
        const answers = (updatedInput?.answers ?? {}) as Record<string, string>;
        const answerMsg: ChatMessage = {
          id: generateId(),
          role: 'answer',
          content:
            behavior === 'allow' ? Object.values(answers).join(', ') || 'Approved' : 'Cancelled',
          timestamp: Date.now(),
          answerData: answers,
        };
        state.updateMessagesForSession(sid, (prev) => [...prev, answerMsg]);
      }
      try {
        await window.electronAPI.agentAnswer(requestId, behavior, updatedInput);
      } catch {
        /* connection error — permission may already be resolved */
      }
    },
    [state],
  );

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    sessionKey: state.activeSessionKey,
    sessionId: state.sessionId,
    streamStartTime: state.streamStartTime,
    pendingPermission: state.pendingPermission,
    permissionMode: state.permissionMode,
    sendMessage: actions.sendMessage,
    loadSession: state.loadSession,
    clearSession: state.clearSession,
    stopStreaming: state.stopStreaming,
    setPermissionMode: state.setPermissionMode,
    togglePlanMode: state.togglePlanMode,
    submitPermissionDecision,
    approvePlan: actions.approvePlan,
    teammates: state.teammates,
    isWaitingResume: state.isWaitingResume,
    setProjectId: state.setProjectId,
    inputTokens: state.inputTokens,
    contextWindow: state.contextWindow,
    isCompacting: state.isCompacting,
    forkFromMessage: state.forkFromMessage,
    suggestions,
  };
}
