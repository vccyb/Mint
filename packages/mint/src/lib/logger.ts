/**
 * Structured logger — zero external dependencies.
 *
 * Follows OpenTelemetry log model conventions:
 *   - service: identifies the service (e.g. "mint-api")
 *   - scope: hierarchical dot notation (e.g. "api.agent", "lib.team-orchestrator")
 *   - traceId: request correlation ID
 *   - duration: elapsed milliseconds for timed operations
 *   - error: auto-enriched from Error instances (type, message, stack)
 *
 * Output modes (LOG_FORMAT env var):
 *   - "pretty": colored human-readable format (auto-enabled in TTY)
 *   - "json": single-line JSON per entry (default in production)
 *
 * Usage:
 *   const log = createLogger('api.agent');
 *   log.info('Request received', { sessionId: 'abc' });
 *
 *   const reqLog = createRequestLogger('api.agent', requestId);
 *   reqLog.info('Stream completed', { contentLength: 1200 });
 *
 *   const done = log.startTimer();
 *   // ... do work ...
 *   done('Operation complete'); // logs with { duration: 1234 }
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ─── Configuration ───

const SERVICE_NAME = process.env['SERVICE_NAME'] ?? 'mint-api';

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

const configuredLevel = getConfiguredLevel();
const prettyMode = isPrettyMode();

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

  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
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
