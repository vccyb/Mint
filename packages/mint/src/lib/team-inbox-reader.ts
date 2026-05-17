import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib.team-inbox-reader');

const CLAUDE_TEAMS_DIR = path.join(os.homedir(), '.claude', 'teams');

const INBOX_RETRY_CONFIG = {
  maxRetries: 5,
  intervalMs: 2000,
};

interface InboxMessage {
  from: string;
  text: string;
  summary?: string;
  timestamp?: string;
  read?: boolean;
  parsedType?: string;
}

interface TeamConfig {
  name: string;
  leadSessionId?: string;
  members?: Array<{ agentId: string; name: string }>;
}

/**
 * Find the team lead's inbox path for a given SDK session.
 * Scans ~/.claude/teams/ directories looking for a config.json
 * whose leadSessionId matches the provided sdkSessionId.
 */
export async function findTeamLeadInboxPath(
  sdkSessionId: string,
): Promise<{ inboxPath: string; teamName: string } | null> {
  try {
    if (!fs.existsSync(CLAUDE_TEAMS_DIR)) return null;

    const teamDirs = fs.readdirSync(CLAUDE_TEAMS_DIR, { withFileTypes: true });
    for (const dir of teamDirs) {
      if (!dir.isDirectory()) continue;

      const configPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'config.json');
      if (!fs.existsSync(configPath)) continue;

      try {
        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const config: TeamConfig = JSON.parse(configRaw);

        if (config.leadSessionId === sdkSessionId) {
          const inboxPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'inboxes', 'team-lead.json');
          if (fs.existsSync(inboxPath)) {
            return { inboxPath, teamName: dir.name };
          }
        }
      } catch {
        // Skip invalid config files
      }
    }
  } catch (error) {
    log.error('Failed to find team lead inbox', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }

  return null;
}

/**
 * Read unread messages from a team lead inbox.
 * Filters out system notifications (idle_notification, shutdown_request, etc.)
 * and already-read messages.
 */
export function readUnreadMessages(inboxPath: string): InboxMessage[] {
  try {
    const raw = fs.readFileSync(inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);
    const SYSTEM_TYPES = ['idle_notification', 'shutdown_request', 'shutdown_approved'];

    return messages.filter(
      (msg) => !msg.read && msg.text && !SYSTEM_TYPES.includes(msg.parsedType ?? ''),
    );
  } catch {
    return [];
  }
}

/**
 * Poll inbox with retry — workers may have timing delays when writing results.
 */
export async function pollInboxWithRetry(
  inboxPath: string,
  config: typeof INBOX_RETRY_CONFIG = INBOX_RETRY_CONFIG,
): Promise<InboxMessage[]> {
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    const messages = readUnreadMessages(inboxPath);
    if (messages.length > 0) return messages;

    await new Promise((resolve) => setTimeout(resolve, config.intervalMs));
  }
  return [];
}

/**
 * Mark all messages in an inbox as read after consuming them.
 */
export function markInboxAsRead(inboxPath: string): void {
  try {
    const raw = fs.readFileSync(inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);
    for (const msg of messages) {
      msg.read = true;
    }
    fs.writeFileSync(inboxPath, JSON.stringify(messages, null, 2));
  } catch (error) {
    log.error('Failed to mark inbox as read', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

/**
 * Format unread inbox messages into a resume prompt for the lead agent.
 */
export function formatInboxPrompt(messages: InboxMessage[]): string {
  const workerResults = messages.map((msg) => `**来自 ${msg.from}**: ${msg.text}`).join('\n\n');

  return [
    '[系统通知] 你的工作者 Agent 已完成任务，以下是他们发送的完整工作结果：',
    '',
    workerResults,
    '',
    '请基于以上工作结果，向用户提供完整、详尽的最终回复。',
  ].join('\n');
}

/**
 * Check whether all workers that were started have reported idle.
 * Reads the team-lead inbox for `idle_notification` messages and counts
 * unique `from` senders.  Used by the Watchdog deadlock detector.
 */
export function areAllWorkersIdle(sdkSessionId: string, startedCount: number): boolean {
  if (startedCount === 0) return true;

  const result = findTeamLeadInboxPathSync(sdkSessionId);
  if (!result) return false;

  try {
    const raw = fs.readFileSync(result.inboxPath, 'utf-8');
    const messages: InboxMessage[] = JSON.parse(raw);

    const idleWorkers = new Set<string>();
    for (const msg of messages) {
      try {
        const parsed = JSON.parse(msg.text);
        if (parsed.type === 'idle_notification' && msg.from) {
          idleWorkers.add(msg.from);
        }
      } catch {
        // Not JSON — skip
      }
    }

    return idleWorkers.size >= startedCount;
  } catch {
    return false;
  }
}

/**
 * Synchronous version of findTeamLeadInboxPath for use in Watchdog
 * (which runs on a timer and cannot be async).
 */
function findTeamLeadInboxPathSync(
  sdkSessionId: string,
): { inboxPath: string; teamName: string } | null {
  try {
    if (!fs.existsSync(CLAUDE_TEAMS_DIR)) return null;

    const teamDirs = fs.readdirSync(CLAUDE_TEAMS_DIR, { withFileTypes: true });
    for (const dir of teamDirs) {
      if (!dir.isDirectory()) continue;

      const configPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'config.json');
      if (!fs.existsSync(configPath)) continue;

      try {
        const configRaw = fs.readFileSync(configPath, 'utf-8');
        const config: TeamConfig = JSON.parse(configRaw);

        if (config.leadSessionId === sdkSessionId) {
          const inboxPath = path.join(CLAUDE_TEAMS_DIR, dir.name, 'inboxes', 'team-lead.json');
          if (fs.existsSync(inboxPath)) {
            return { inboxPath, teamName: dir.name };
          }
        }
      } catch {
        // Skip invalid config files
      }
    }
  } catch {
    // Ignore filesystem errors
  }

  return null;
}

/**
 * Format task notification summaries as a fallback resume prompt
 * when inbox messages are unavailable.
 */
export function formatSummaryFallbackPrompt(
  summaries: Array<{ taskId: string; summary: string; status?: string }>,
): string {
  const lines = summaries
    .map((s, i) => `**Worker ${i + 1} (${s.status ?? 'completed'})**: ${s.summary}`)
    .join('\n\n');

  return [
    '[系统通知] 你的工作者 Agent 已完成任务，以下是他们的工作摘要：',
    '',
    lines,
    '',
    '请基于以上工作摘要，向用户提供完整、详尽的最终回复。',
  ].join('\n');
}
