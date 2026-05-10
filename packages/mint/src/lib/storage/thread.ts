import { promises as fs } from 'fs';
import path from 'path';
import type { Thread, FileChange, ChatMessage } from '@/types';

const THREADS_DIR = 'threads';
const FILE_CHANGES_DIR = 'file-changes';

/** 线程存储 */
export class ThreadStorage {
  constructor(private dataDir: string) {}

  private getThreadsDir(): string {
    return path.join(this.dataDir, THREADS_DIR);
  }

  private getThreadDir(threadId: string): string {
    return path.join(this.getThreadsDir(), threadId);
  }

  private getMetadataPath(threadId: string): string {
    return path.join(this.getThreadDir(threadId), 'metadata.json');
  }

  private getMessagesPath(threadId: string): string {
    return path.join(this.getThreadDir(threadId), 'messages.jsonl');
  }

  private getFileChangesDir(): string {
    return path.join(this.dataDir, FILE_CHANGES_DIR);
  }

  private getFileChangesPath(threadId: string): string {
    return path.join(this.getFileChangesDir(), `${threadId}.json`);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.getThreadsDir(), { recursive: true });
    await fs.mkdir(this.getFileChangesDir(), { recursive: true });
  }

  /** 创建新线程 */
  async create(thread: Omit<Thread, 'id'> & { id?: string }): Promise<Thread> {
    const newThread: Thread = {
      id: thread.id || `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: thread.title,
      type: thread.type,
      projectId: thread.projectId || null,
      createdAt: thread.createdAt || Date.now(),
      updatedAt: thread.updatedAt || Date.now(),
      messageCount: thread.messageCount || 0,
      pinned: thread.pinned || false,
      pinnedAt: thread.pinnedAt,
      mode: thread.mode || 'agent',
      model: thread.model || 'glm-5.1',
    };

    const threadDir = this.getThreadDir(newThread.id);
    await fs.mkdir(threadDir, { recursive: true });

    // 保存元数据
    await fs.writeFile(
      this.getMetadataPath(newThread.id),
      JSON.stringify(newThread, null, 2),
    );

    // 创建空消息文件
    await fs.writeFile(this.getMessagesPath(newThread.id), '');

    return newThread;
  }

  /** 更新线程 */
  async update(threadId: string, partial: Partial<Thread>): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) throw new Error(`Thread not found: ${threadId}`);

    const updated = { ...thread, ...partial, updatedAt: Date.now() };
    await fs.writeFile(
      this.getMetadataPath(threadId),
      JSON.stringify(updated, null, 2),
    );
  }

  /** 删除线程 */
  async delete(threadId: string): Promise<void> {
    const threadDir = this.getThreadDir(threadId);
    try {
      await fs.rm(threadDir, { recursive: true, force: true });
      // 同时删除文件变更记录
      const changesPath = this.getFileChangesPath(threadId);
      try {
        await fs.unlink(changesPath);
      } catch {
        // ignore if not exists
      }
    } catch {
      throw new Error(`Thread not found: ${threadId}`);
    }
  }

  /** 获取单个线程 */
  async get(threadId: string): Promise<Thread | null> {
    try {
      const content = await fs.readFile(this.getMetadataPath(threadId), 'utf-8');
      return JSON.parse(content) as Thread;
    } catch {
      return null;
    }
  }

  /** 列出所有线程，可选按工程筛选 */
  async list(projectId?: string | null): Promise<Thread[]> {
    try {
      const entries = await fs.readdir(this.getThreadsDir(), { withFileTypes: true });
      const threads: Thread[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const metadataPath = this.getMetadataPath(entry.name);
        try {
          const content = await fs.readFile(metadataPath, 'utf-8');
          const thread = JSON.parse(content) as Thread;

          // 按 projectId 筛选
          if (projectId !== undefined) {
            if (projectId === null) {
              // 只返回独立对话（无工程）
              if (thread.projectId !== null) continue;
            } else {
              // 只返回属于指定工程的对话
              if (thread.projectId !== projectId) continue;
            }
          }

          threads.push(thread);
        } catch {
          // skip invalid entries
        }
      }

      // 按更新时间倒序排列
      return threads.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  /** 添加消息到线程 */
  async appendMessage(threadId: string, message: ChatMessage): Promise<void> {
    const thread = await this.get(threadId);
    if (!thread) throw new Error(`Thread not found: ${threadId}`);

    const messageLine = JSON.stringify({ type: 'message', message }) + '\n';
    await fs.appendFile(this.getMessagesPath(threadId), messageLine);

    // 更新消息计数和更新时间
    await this.update(threadId, {
      messageCount: thread.messageCount + 1,
      updatedAt: Date.now(),
    });
  }

  /** 读取线程的所有消息 */
  async readMessages(threadId: string): Promise<ChatMessage[]> {
    try {
      const content = await fs.readFile(this.getMessagesPath(threadId), 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const messages: ChatMessage[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'message') {
            messages.push(data.message as ChatMessage);
          }
        } catch {
          // skip invalid lines
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  /** 添加文件变更记录 */
  async addFileChange(change: Omit<FileChange, 'id'> & { id?: string }): Promise<FileChange> {
    const threadId = change.threadId;
    const newChange: FileChange = {
      id: change.id || `change-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      threadId,
      filePath: change.filePath,
      changeType: change.changeType,
      additions: change.additions,
      deletions: change.deletions,
      timestamp: change.timestamp || Date.now(),
    };

    const changesPath = this.getFileChangesPath(threadId);
    let changes: FileChange[] = [];

    try {
      const content = await fs.readFile(changesPath, 'utf-8');
      changes = JSON.parse(content);
    } catch {
      // file doesn't exist yet
    }

    changes.push(newChange);
    await fs.writeFile(changesPath, JSON.stringify(changes, null, 2));

    return newChange;
  }

  /** 获取线程的所有文件变更 */
  async getFileChanges(threadId: string): Promise<FileChange[]> {
    const changesPath = this.getFileChangesPath(threadId);
    try {
      const content = await fs.readFile(changesPath, 'utf-8');
      const changes = JSON.parse(content) as FileChange[];
      // 按时间倒序排列
      return changes.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /** 清空线程的文件变更记录 */
  async clearFileChanges(threadId: string): Promise<void> {
    const changesPath = this.getFileChangesPath(threadId);
    try {
      await fs.writeFile(changesPath, JSON.stringify([], null, 2));
    } catch {
      // ignore if doesn't exist
    }
  }
}
