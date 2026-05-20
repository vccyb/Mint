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

import {
  LOG_LEVEL_PRIORITY,
  nextLogId,
  pushEntry,
  type LogLevel,
  type LogEntry,
} from './ring-buffer';
export type { LogLevel, LogEntry, ErrorInfo } from './ring-buffer';
export { getRecentLogs, getLogStats } from './ring-buffer';

import { extractError, formatJson, formatPretty } from './formatters';

// ─── Configuration ───

const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'mint-api';
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
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    const now = Date.now();
    const maxAge = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!entry.startsWith('mint-') || !entry.endsWith('.log')) continue;
      const filePath = join(dir, entry);
      try {
        const s = await stat(filePath);
        if (now - s.mtimeMs > maxAge) await unlink(filePath);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* ignore */
  }
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

  const { cleanedMeta, error } = meta
    ? extractError(meta)
    : { cleanedMeta: {} as Record<string, unknown>, error: undefined };

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
    id: nextLogId(),
    timestamp: entry.timestamp as string,
    level,
    service: SERVICE_NAME,
    scope,
    message,
    ...(Object.keys(cleanedMeta).length > 0 ? { data: cleanedMeta } : {}),
    ...(error ? { error } : {}),
    ...(traceId ? { traceId } : {}),
  };
  pushEntry(logEntry);

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

    withScope: (operation: string) => makeLogger(`${scope}.${operation}`, traceId),
  };
}

export function createLogger(scope: string): Logger {
  return makeLogger(scope);
}

export function createRequestLogger(scope: string, requestId: string): Logger {
  return makeLogger(scope, requestId);
}
