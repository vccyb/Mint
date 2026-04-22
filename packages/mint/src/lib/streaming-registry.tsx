'use client';

import { createContext, useContext, useRef, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import type { Mode } from '@/types';

export interface StreamStatus {
  isStreaming: boolean;
  mode: Mode;
}

export class StreamingRegistry {
  private statuses = new Map<string, StreamStatus>();
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Set<() => void>();
  private readonly MAX_CONCURRENT = 5;
  private cachedSnapshot: Map<string, StreamStatus> | null = null;

  register(sessionId: string, mode: Mode, abortController: AbortController): void {
    this.statuses.set(sessionId, { isStreaming: true, mode });
    this.abortControllers.set(sessionId, abortController);
    this.emit();
  }

  complete(sessionId: string): void {
    const status = this.statuses.get(sessionId);
    if (status) {
      this.statuses.set(sessionId, { ...status, isStreaming: false });
      this.abortControllers.delete(sessionId);
      this.emit();
    }
  }

  abort(sessionId: string): void {
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
    this.statuses.delete(sessionId);
    this.abortControllers.delete(sessionId);
    this.emit();
  }

  getStatus(sessionId: string): StreamStatus | undefined {
    return this.statuses.get(sessionId);
  }

  getActiveCount(): number {
    let count = 0;
    for (const status of this.statuses.values()) {
      if (status.isStreaming) count++;
    }
    return count;
  }

  canStartNew(): boolean {
    return this.getActiveCount() < this.MAX_CONCURRENT;
  }

  getSnapshot(): Map<string, StreamStatus> {
    if (!this.cachedSnapshot) {
      this.cachedSnapshot = new Map(this.statuses);
    }
    return this.cachedSnapshot;
  }

  getAbortController(sessionId: string): AbortController | undefined {
    return this.abortControllers.get(sessionId);
  }

  remove(sessionId: string): void {
    this.statuses.delete(sessionId);
    this.abortControllers.delete(sessionId);
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

const StreamingRegistryContext = createContext<StreamingRegistry | null>(null);

export function StreamingRegistryProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<StreamingRegistry | null>(null);
  if (!registryRef.current) {
    registryRef.current = new StreamingRegistry();
  }
  return (
    <StreamingRegistryContext.Provider value={registryRef.current}>
      {children}
    </StreamingRegistryContext.Provider>
  );
}

export function useStreamingRegistry(): StreamingRegistry {
  const registry = useContext(StreamingRegistryContext);
  if (!registry) {
    throw new Error('useStreamingRegistry must be used within a StreamingRegistryProvider');
  }
  return registry;
}

const emptyStatuses = new Map<string, StreamStatus>();

export function useStreamStatuses(): Map<string, StreamStatus> {
  const registry = useStreamingRegistry();

  const subscribe = useCallback(
    (callback: () => void) => registry.subscribe(callback),
    [registry],
  );

  const getSnapshot = useCallback(
    () => registry.getSnapshot(),
    [registry],
  );

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => emptyStatuses,
  );
}
