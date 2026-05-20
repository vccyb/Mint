/**
 * Log formatting — ANSI color helpers and JSON/pretty formatters.
 *
 * Two output formats:
 *   - pretty: colored human-readable output for TTY
 *   - json: single-line JSON for production / structured pipelines
 */

import type { LogLevel, ErrorInfo } from './ring-buffer';

// ─── ANSI escape codes (zero deps) ───

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

export function extractError(meta: Record<string, unknown>): {
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
  'timestamp',
  'level',
  'service',
  'scope',
  'message',
  'traceId',
  'spanId',
  'duration',
  'error',
]);

export function formatJson(entry: Record<string, unknown>): string {
  return JSON.stringify(entry);
}

export function formatPretty(entry: Record<string, unknown>): string {
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
