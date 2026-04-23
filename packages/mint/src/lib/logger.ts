/**
 * Lightweight structured logger — zero external dependencies.
 * Outputs single-line JSON to stdout/stderr for machine parsing.
 *
 * Usage:
 *   const log = createLogger('chat-route');
 *   log.info('Request received', { sessionId: 'abc' });
 *
 *   const reqLog = createRequestLogger('chat-route', requestId);
 *   reqLog.info('Stream completed', { contentLength: 1200 });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env['LOG_LEVEL']?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) return envLevel as LogLevel;
  return 'info';
}

interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly module: string;
  readonly message: string;
  readonly meta?: Record<string, unknown>;
  readonly requestId?: string;
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

const configuredLevel = getConfiguredLevel();

function log(level: LogLevel, module: string, message: string, meta?: Record<string, unknown>, requestId?: string): void {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[configuredLevel]) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(meta && { meta }),
    ...(requestId && { requestId }),
  };
  const line = formatEntry(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export interface Logger {
  readonly debug: (msg: string, meta?: Record<string, unknown>) => void;
  readonly info: (msg: string, meta?: Record<string, unknown>) => void;
  readonly warn: (msg: string, meta?: Record<string, unknown>) => void;
  readonly error: (msg: string, meta?: Record<string, unknown>) => void;
}

export function createLogger(module: string): Logger {
  return {
    debug: (msg, meta?) => log('debug', module, msg, meta),
    info: (msg, meta?) => log('info', module, msg, meta),
    warn: (msg, meta?) => log('warn', module, msg, meta),
    error: (msg, meta?) => log('error', module, msg, meta),
  };
}

export function createRequestLogger(module: string, requestId: string): Logger {
  return {
    debug: (msg, meta?) => log('debug', module, msg, meta, requestId),
    info: (msg, meta?) => log('info', module, msg, meta, requestId),
    warn: (msg, meta?) => log('warn', module, msg, meta, requestId),
    error: (msg, meta?) => log('error', module, msg, meta, requestId),
  };
}
