/**
 * Structured logger — zero external dependencies.
 *
 * Features:
 *   - Four log levels: debug, info, warn, error
 *   - Two output formats: pretty (colored TTY) and JSON (production)
 *   - In-memory ring buffer for live log viewing
 *   - Optional file persistence with daily rotation (LOG_FILE=1)
 *   - Hierarchical scopes and request-scoped trace IDs
 *   - Automatic Error enrichment (type, message, stack)
 *
 * Environment variables:
 *   LOG_LEVEL   — debug|info|warn|error (default: info)
 *   LOG_FORMAT  — pretty|json (default: pretty in TTY, json otherwise)
 *   LOG_FILE    — set to "1" to enable file output to ~/.mint/logs/
 */

import { appendFile, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── Configuration ───

const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'mint-api';
const LOG_BUFFER_SIZE = 5000;
const LOG_RETENTION_DAYS = 7;

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) return envLevel as LogLevel;
  return 'info';
}

function isPrettyMode(): boolean {
  const format = process.env['LOG_FORMAT']?.toLowerCase();
  if (format === 'json') return false;
  if (format === 'pretty') return true;
  return process.stdout.isTTY === true;
}

function isFileLoggingEnabled(): boolean {
  return process.env['LOG_FILE'] === '1';
}

const configuredLevel = getConfiguredLevel();
const prettyMode = isPrettyMode();
const fileLogging = isFileLoggingEnabled();

// ─── ANSI colors (zero deps) ───

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: DIM,
  info: GREEN,
  warn: YELLOW,
  error: RED + BOLD,
};

// ─── Error enrichment ───

interface ErrorInfo {
  type: string;
  message: string;
  stack?: string;
}

function extractError(meta: Record<string, unknown>): {
  cleanedMeta: Record<string, unknown>;
  error?: ErrorInfo;
} {
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      const { [key]: _, ...rest } = meta;
      return {
        cleanedMeta: rest,
        error: {
          type: value.constructor.name,
          message: value.message,
          stack: value.stack?.split('\n').slice(0, 10).join('\n'),
        },
      };
    }
  }
  return { cleanedMeta: meta };
}

// ─── Formatters ───

const CORE_KEYS = new Set([
  'timestamp', 'level', 'service', 'scope', 'message',
  'traceId', 'spanId', 'duration', 'error',
]);

function formatJson(entry: Record<string, unknown>): string {
  return JSON.stringify(entry);
}

function formatPretty(entry: Record<string, unknown>): string {
  const time = (entry.timestamp as string).slice(11, 23); // HH:mm:ss.SSS
  const level = entry.level as LogLevel;
  const scope = entry.scope as string;
  const msg = entry.message as string;
  const color = LEVEL_COLORS[level];
  const levelStr = level.toUpperCase().padEnd(5);

  let line = `${DIM}${time}${RESET} ${color}${levelStr}${RESET} ${CYAN}${scope}${RESET} ${msg}`;

  // Extra fields
  const extras: string[] = [];
  for (const [k, v] of Object.entries(entry)) {
    if (CORE_KEYS.has(k)) continue;
    extras.push(
      typeof v === 'object' && v !== null
        ? `${DIM}${k}=${JSON.stringify(v)}${RESET}`
        : `${DIM}${k}=${String(v)}${RESET}`,
    );
  }
  if (entry.traceId) extras.push(`${DIM}traceId=${String(entry.traceId)}${RESET}`);
  if (entry.duration != null) extras.push(`${DIM}duration=${String(entry.duration)}ms${RESET}`);

  if (extras.length > 0) {
    line += '\n  ' + extras.join(' ');
  }

  // Error block
  if (entry.error && typeof entry.error === 'object') {
    const err = entry.error as ErrorInfo;
    line += `\n  ${RED}error.type=${err.type} error.message="${err.message}"${RESET}`;
    if (err.stack) {
      const stackLines = err.stack.split('\n').slice(0, 5).join('\n  ');
      line += `\n  ${DIM}${stackLines}${RESET}`;
    }
  }

  return line;
}

// ─── File persistence ───

function getLogDir(): string {
  return join(homedir(), '.mint', 'logs');
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return join(getLogDir(), `mint-${date}.log`);
}

async function writeToFile(line: string): Promise<void> {
  try {
    const dir = getLogDir();
    await mkdir(dir, { recursive: true });
    await appendFile(getLogFilePath(), line + '\n');
  } catch {
    // File write failure must not break the application
  }
}

/** Clean up log files older than LOG_RETENTION_DAYS. Called lazily. */
let cleanupDone = false;
async function cleanupOldLogs(): Promise<void> {
  if (cleanupDone) return;
  cleanupDone = true;
  try {
    const { readdir, stat, unlink } = await import('fs/promises');
    const dir = getLogDir();
    let entries;
    try { entries = await readdir(dir); } catch { return; }
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.startsWith('mint-') || !entry.endsWith('.log')) continue;
      const filePath = join(dir, entry);
      try {
        const s = await stat(filePath);
        if (now - s.mtimeMs > maxAge) await unlink(filePath);
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}

// ─── In-memory ring buffer for log viewing ───

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

const ringBuffer: LogEntry[] = [];
let logCounter = 0;

export function getRecentLogs(filter?: { sessionId?: string; scope?: string; level?: LogLevel; limit?: number; offset?: number }): { entries: LogEntry[]; total: number } {
  let entries = ringBuffer;
  if (filter?.level) {
    const minPriority = LOG_LEVEL_PRIORITY[filter.level];
    entries = entries.filter(e => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
  }
  if (filter?.scope) {
    entries = entries.filter(e => e.scope.startsWith(filter.scope!));
  }
  if (filter?.sessionId) {
    entries = entries.filter(e => e.data?.sessionId === filter.sessionId);
  }
  const total = entries.length;
  const limit = filter?.limit ?? 100;
  const offset = filter?.offset ?? 0;
  return { entries: entries.slice(offset, offset + limit), total };
}

export function getLogStats(): { total: number; byLevel: Record<string, number>; byScope: Record<string, number>; sessions: Array<{ sessionId: string; count: number }> } {
  const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  const byScope: Record<string, number> = {};
  const sessionMap: Record<string, number> = {};

  for (const entry of ringBuffer) {
    byLevel[entry.level] = (byLevel[entry.level] ?? 0) + 1;
    const topScope = entry.scope.split('.')[0];
    byScope[topScope] = (byScope[topScope] ?? 0) + 1;
    if (entry.data?.sessionId && typeof entry.data.sessionId === 'string') {
      sessionMap[entry.data.sessionId as string] = (sessionMap[entry.data.sessionId as string] ?? 0) + 1;
    }
  }

  const sessions = Object.entries(sessionMap)
    .map(([sessionId, count]) => ({ sessionId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { total: ringBuffer.length, byLevel, byScope, sessions };
}

// ─── Core log function ───

function log(
  level: LogLevel,
  scope: string,
  message: string,
  meta: Record<string, unknown> | undefined,
  traceId: string | undefined,
): void {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[configuredLevel]) return;

  const { cleanedMeta, error } = meta ? extractError(meta) : { cleanedMeta: {} as Record<string, unknown>, error: undefined };

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    scope,
    message,
    ...cleanedMeta,
    ...(traceId && { traceId }),
    ...(error && { error }),
  };

  const line = prettyMode ? formatPretty(entry) : formatJson(entry);

  // Capture to ring buffer
  const logEntry: LogEntry = {
    id: `log-${++logCounter}`,
    timestamp: entry.timestamp as string,
    level,
    service: SERVICE_NAME,
    scope,
    message,
    ...(Object.keys(cleanedMeta).length > 0 ? { data: cleanedMeta } : {}),
    ...(error ? { error } : {}),
    ...(traceId ? { traceId } : {}),
  };
  ringBuffer.push(logEntry);
  if (ringBuffer.length > LOG_BUFFER_SIZE) ringBuffer.shift();

  // Console output
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }

  // File persistence (async, fire-and-forget)
  if (fileLogging) {
    const jsonLine = formatJson(entry);
    writeToFile(jsonLine).then(() => cleanupOldLogs());
  }
}

// ─── Logger interface ───

export interface Logger {
  readonly debug: (msg: string, meta?: Record<string, unknown>) => void;
  readonly info: (msg: string, meta?: Record<string, unknown>) => void;
  readonly warn: (msg: string, meta?: Record<string, unknown>) => void;
  readonly error: (msg: string, meta?: Record<string, unknown>) => void;
  /** Start a timer. Call the returned function to log duration. */
  readonly startTimer: () => (message?: string) => number;
  /** Create a child logger with extended scope (e.g. "api.agent" + "POST" = "api.agent.POST") */
  readonly withScope: (operation: string) => Logger;
}

function makeLogger(scope: string, traceId?: string): Logger {
  const emit = (level: LogLevel, msg: string, meta?: Record<string, unknown>) =>
    log(level, scope, msg, meta, traceId);

  return {
    debug: (msg, meta?) => emit('debug', msg, meta),
    info: (msg, meta?) => emit('info', msg, meta),
    warn: (msg, meta?) => emit('warn', msg, meta),
    error: (msg, meta?) => emit('error', msg, meta),

    startTimer: () => {
      const start = Date.now();
      return (message?: string) => {
        const duration = Date.now() - start;
        emit('info', message ?? 'Operation completed', { duration });
        return duration;
      };
    },

    withScope: (operation: string) =>
      makeLogger(`${scope}.${operation}`, traceId),
  };
}

export function createLogger(scope: string): Logger {
  return makeLogger(scope);
}

export function createRequestLogger(scope: string, requestId: string): Logger {
  return makeLogger(scope, requestId);
}
