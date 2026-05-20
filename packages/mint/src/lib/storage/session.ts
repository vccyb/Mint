import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '@/lib/logger';
import type { ChatMessage, SessionMetadata, SessionRecord } from '@/types';

const log = createLogger('storage.session');

export class SessionStorage {
  constructor(private sessionsDir: string) {}

  async create(metadata: SessionMetadata): Promise<void> {
    const filePath = this.getFilePath(metadata.id);
    const record: SessionRecord = { type: 'metadata', metadata };
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(record) + '\n');
    log.debug('Session created', { sessionId: metadata.id });
  }

  async append(sessionId: string, message: ChatMessage): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    const record: SessionRecord = { type: 'message', message };
    await fs.appendFile(filePath, JSON.stringify(record) + '\n');
    log.debug('Message appended', { sessionId });
  }

  async read(sessionId: string): Promise<{ metadata: SessionMetadata; messages: ChatMessage[] }> {
    const filePath = this.getFilePath(sessionId);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    let metadata: SessionMetadata | null = null;
    const messages: ChatMessage[] = [];

    for (const line of lines) {
      const record: SessionRecord = JSON.parse(line);
      if (record.type === 'metadata' && record.metadata) {
        metadata = record.metadata;
      } else if (record.type === 'message' && record.message) {
        messages.push(record.message);
      }
    }

    if (!metadata) {
      throw new Error(`Session ${sessionId} has no metadata`);
    }

    log.debug('Session read', { sessionId, messageCount: messages.length });
    return { metadata, messages };
  }

  async updateMetadata(sessionId: string, partial: Partial<SessionMetadata>): Promise<void> {
    const { metadata, messages } = await this.read(sessionId);
    const updated = { ...metadata, ...partial };

    const filePath = this.getFilePath(sessionId);
    const lines: string[] = [JSON.stringify({ type: 'metadata', metadata: updated })];
    for (const msg of messages) {
      lines.push(JSON.stringify({ type: 'message', message: msg }));
    }
    await fs.writeFile(filePath, lines.join('\n') + '\n');
    log.debug('Metadata updated', { sessionId, fields: Object.keys(partial) });
  }

  async list(): Promise<SessionMetadata[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      const metas: SessionMetadata[] = [];
      for (const file of jsonlFiles) {
        try {
          const sessionId = file.replace('.jsonl', '');
          const { metadata } = await this.read(sessionId);
          metas.push(metadata);
        } catch {
          log.warn('Skipping corrupted session file', { file });
        }
      }

      return metas.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.pinned && b.pinned) return (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0);
        return b.updatedAt - a.updatedAt;
      });
    } catch {
      log.warn('Failed to list sessions');
      return [];
    }
  }

  async delete(sessionId: string): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    await fs.unlink(filePath).catch(() => {});
    log.debug('Session deleted', { sessionId });
  }

  /**
   * Truncate all messages at and after the given message ID.
   * Returns the remaining message count.
   */
  async truncateAfterMessage(sessionId: string, messageId: string): Promise<number> {
    const { metadata, messages } = await this.read(sessionId);
    const index = messages.findIndex((m) => m.id === messageId);
    if (index < 0) {
      throw new Error(`Message ${messageId} not found in session ${sessionId}`);
    }
    const kept = messages.slice(0, index);
    const filePath = this.getFilePath(sessionId);
    const lines: string[] = [
      JSON.stringify({
        type: 'metadata',
        metadata: { ...metadata, messageCount: kept.length, updatedAt: Date.now() },
      }),
    ];
    for (const msg of kept) {
      lines.push(JSON.stringify({ type: 'message', message: msg }));
    }
    await fs.writeFile(filePath, lines.join('\n') + '\n');
    log.debug('Session truncated', { sessionId, fromMessageId: messageId, keptCount: kept.length });
    return kept.length;
  }

  private getFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.jsonl`);
  }
}
