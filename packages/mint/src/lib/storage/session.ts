import { promises as fs } from 'fs';
import path from 'path';
import type { ChatMessage, SessionMetadata, SessionRecord } from '@/types';

export class SessionStorage {
  constructor(private sessionsDir: string) {}

  async create(metadata: SessionMetadata): Promise<void> {
    const filePath = this.getFilePath(metadata.id);
    const record: SessionRecord = { type: 'metadata', metadata };
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(record) + '\n');
  }

  async append(sessionId: string, message: ChatMessage): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    const record: SessionRecord = { type: 'message', message };
    await fs.appendFile(filePath, JSON.stringify(record) + '\n');
  }

  async read(
    sessionId: string,
  ): Promise<{ metadata: SessionMetadata; messages: ChatMessage[] }> {
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
          // skip corrupted files
        }
      }

      return metas.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.pinned && b.pinned) return (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0);
        return b.updatedAt - a.updatedAt;
      });
    } catch {
      return [];
    }
  }

  async delete(sessionId: string): Promise<void> {
    const filePath = this.getFilePath(sessionId);
    await fs.unlink(filePath).catch(() => {});
  }

  private getFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.jsonl`);
  }
}
