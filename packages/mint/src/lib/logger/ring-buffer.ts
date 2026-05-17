/**
 * In-memory ring buffer for live log viewing.
 *
 * Stores up to LOG_BUFFER_SIZE entries in a fixed-size array.
 * Oldest entries are discarded when the buffer is full.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface ErrorInfo {
  type: string;
  message: string;
  stack?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
  error?: ErrorInfo;
  traceId?: string;
}

const LOG_BUFFER_SIZE = 5000;

const ringBuffer: LogEntry[] = [];
let logCounter = 0;

/** Push an entry into the ring buffer, evicting the oldest if at capacity. */
export function pushEntry(entry: LogEntry): void {
  ringBuffer.push(entry);
  if (ringBuffer.length > LOG_BUFFER_SIZE) ringBuffer.shift();
}

/** Return the current buffer length (useful for generating sequential IDs). */
export function nextLogId(): string {
  return `log-${++logCounter}`;
}

export function getRecentLogs(filter?: {
  sessionId?: string;
  scope?: string;
  level?: LogLevel;
  limit?: number;
  offset?: number;
}): { entries: LogEntry[]; total: number } {
  let entries = ringBuffer;
  if (filter?.level) {
    const minPriority = LOG_LEVEL_PRIORITY[filter.level];
    entries = entries.filter((e) => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
  }
  if (filter?.scope) {
    entries = entries.filter((e) => e.scope.startsWith(filter.scope!));
  }
  if (filter?.sessionId) {
    entries = entries.filter((e) => e.data?.sessionId === filter.sessionId);
  }
  const total = entries.length;
  const limit = filter?.limit ?? 100;
  const offset = filter?.offset ?? 0;
  return { entries: entries.slice(offset, offset + limit), total };
}

export function getLogStats(): {
  total: number;
  byLevel: Record<string, number>;
  byScope: Record<string, number>;
  sessions: Array<{ sessionId: string; count: number }>;
} {
  const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byScope: Record<string, number> = {};
  const sessionMap: Record<string, number> = {};

  for (const entry of ringBuffer) {
    byLevel[entry.level] = (byLevel[entry.level] ?? 0) + 1;
    const topScope = entry.scope.split('.')[0];
    byScope[topScope] = (byScope[topScope] ?? 0) + 1;
    if (entry.data?.sessionId && typeof entry.data.sessionId === 'string') {
      sessionMap[entry.data.sessionId as string] =
        (sessionMap[entry.data.sessionId as string] ?? 0) + 1;
    }
  }

  const sessions = Object.entries(sessionMap)
    .map(([sessionId, count]) => ({ sessionId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { total: ringBuffer.length, byLevel, byScope, sessions };
}
