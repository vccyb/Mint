/**
 * Centralized constants for the Mint application.
 * All hardcoded values should be extracted here for configurability and maintainability.
 */

// ── Provider Defaults ────────────────────────────────────────────────
export const DEFAULT_MODEL = 'glm-5.1';
export const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/anthropic';

// ── API / Chat ───────────────────────────────────────────────────────
export const MAX_TOKENS = 4096;
export const THINKING_BUDGET_TOKENS = 10000;

// ── Attachments ──────────────────────────────────────────────────────
export const MAX_ATTACHMENT_SIZE = 1024 * 1024; // 1 MB

// ── Agent Orchestration ──────────────────────────────────────────────
export const MAX_AUTO_RETRIES = 3;
export const RETRY_BASE_MS = 1000;
export const GLOBAL_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// ── Streaming Concurrency ────────────────────────────────────────────
export const MAX_CONCURRENT_STREAMS = 5;

// ── Permissions ──────────────────────────────────────────────────────
export const PERMISSION_TIMEOUT_MS = 60_000; // 1 minute

// ── Read-Only Tools (allowed without explicit permission) ────────────
export const READ_ONLY_TOOLS: string[] = [
  'Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch',
  'TaskOutput', 'Agent', 'TodoWrite',
  'mcp__pencil__get_editor_state',
  'mcp__pencil__batch_get',
];
