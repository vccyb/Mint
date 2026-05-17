'use client';

import { useCallback } from 'react';
import type { ChatMessage, Mode, StreamEventData, TeammateState } from '@/types';
import { handleStreamEvent, type StreamEventCallbacks } from '@/hooks/use-stream-events';
import type { StreamingRegistry } from '@/lib/streaming-registry';
import type { PermissionMode } from './use-session-state';

interface SSEStreamDeps {
  mode: Mode;
  registry: StreamingRegistry;
  updateMessagesForSession: (
    sid: string,
    updater: (prev: ChatMessage[]) => ChatMessage[],
  ) => void;
  abortControllersRef: React.MutableRefObject<Map<string, AbortController>>;
  setPendingPermissions: React.Dispatch<
    React.SetStateAction<Map<string, import('@/types').PermissionRequestData>>
  >;
  setTeammatesMap: React.Dispatch<React.SetStateAction<Map<string, TeammateState[]>>>;
  setWaitingResumeMap: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
  setLocalStreamingSessionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setStreamStartTimes: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setInputTokensMap: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setContextWindowMap: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  setCompactingMap: React.Dispatch<React.SetStateAction<Map<string, boolean>>>;
}

export interface SSEStreamReturn {
  buildCallbacks: (assistantId: string) => StreamEventCallbacks;
  cleanupSession: (sid: string, resolvedSessionId: string | null) => void;
  processSSEStream: (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantId: string,
    sid: string,
    onSessionResolved?: (sessionId: string) => void,
  ) => Promise<void>;
}

export function useSSEStream(deps: SSEStreamDeps): SSEStreamReturn {
  const {
    mode,
    registry,
    updateMessagesForSession,
    abortControllersRef,
    setPendingPermissions,
    setTeammatesMap,
    setWaitingResumeMap,
    setLocalStreamingSessionIds,
    setStreamStartTimes,
    setInputTokensMap,
    setContextWindowMap,
    setCompactingMap,
  } = deps;

  /** Build callbacks object for handleStreamEvent. */
  const buildCallbacks = useCallback(
    (assistantId: string): StreamEventCallbacks => ({
      updateMessages: updateMessagesForSession,
      setPendingPermissions,
      setTeammatesMap,
      setWaitingResumeMap,
      registryComplete: (sid: string) => registry.complete(sid),
      removeAbortController: (sid: string) => {
        abortControllersRef.current.delete(sid);
      },
      removeStreamingId: (sid: string) => {
        setLocalStreamingSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sid);
          return next;
        });
      },
      removeStreamStartTime: (sid: string) => {
        setStreamStartTimes((prev) => {
          const n = new Map(prev);
          n.delete(sid);
          return n;
        });
      },
      setInputTokens: setInputTokensMap,
      setContextWindow: setContextWindowMap,
      setCompacting: setCompactingMap,
    }),
    [updateMessagesForSession, registry, setPendingPermissions, setTeammatesMap, setWaitingResumeMap, setLocalStreamingSessionIds, setStreamStartTimes, abortControllersRef, setInputTokensMap, setContextWindowMap, setCompactingMap],
  );

  /** Cleanup helpers for error/abort paths. */
  const cleanupSession = useCallback(
    (sid: string, resolvedSessionId: string | null) => {
      if (resolvedSessionId && mode === 'agent') registry.complete(resolvedSessionId);
      abortControllersRef.current.delete(sid);
      setLocalStreamingSessionIds((prev) => {
        const next = new Set(prev);
        next.delete(sid);
        return next;
      });
      setStreamStartTimes((prev) => {
        const n = new Map(prev);
        n.delete(sid);
        return n;
      });
      setWaitingResumeMap((prev) => {
        const n = new Map(prev);
        n.delete(sid);
        return n;
      });
    },
    [mode, registry, abortControllersRef, setLocalStreamingSessionIds, setStreamStartTimes, setWaitingResumeMap],
  );

  /** Shared SSE stream processing loop. */
  const processSSEStream = useCallback(
    async (
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
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            // Resolve sessionId from server
            if (event.sessionId && !resolvedSessionId) {
              resolvedSessionId = event.sessionId;
              onSessionResolved?.(event.sessionId);
            }

            // Set isPlanMode on assistant message
            if (event.isPlanMode) {
              const planSid = resolvedSessionId ?? sid;
              updateMessagesForSession(planSid, (prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isPlanMode: true } : m)),
              );
            }

            const effectiveSid = resolvedSessionId ?? sid;
            handleStreamEvent(
              event,
              {
                sessionId: effectiveSid,
                assistantId,
                resolvedSessionId,
                mode,
              },
              cb,
            );
          }
        }
      }
    },
    [buildCallbacks, mode, updateMessagesForSession],
  );

  return {
    buildCallbacks,
    cleanupSession,
    processSSEStream,
  };
}
