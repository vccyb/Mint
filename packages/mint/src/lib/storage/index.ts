import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { ChatMessage, SessionMetadata, StorageAdapter } from '@/types';
import { ConfigStorage, type AppConfig } from './config';
import { SessionStorage } from './session';
import { GroupStorage } from './group';
import { ensureSkillsDirs } from './skills';

export class FileSystemStorage implements StorageAdapter {
  public readonly config: ConfigStorage;
  public readonly sessions: SessionStorage;
  public readonly groups: GroupStorage;

  constructor(
    private dataDir: string,
    private sessionsDir: string,
  ) {
    this.config = new ConfigStorage(path.join(dataDir, 'config.json'));
    this.sessions = new SessionStorage(sessionsDir);
    this.groups = new GroupStorage(dataDir);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await ensureSkillsDirs();
  }

  async createSession(metadata: SessionMetadata): Promise<void> {
    return this.sessions.create(metadata);
  }

  async appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
    return this.sessions.append(sessionId, message);
  }

  async readSession(sessionId: string): Promise<{ metadata: SessionMetadata; messages: ChatMessage[] }> {
    return this.sessions.read(sessionId);
  }

  async listSessions(): Promise<SessionMetadata[]> {
    return this.sessions.list();
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.sessions.delete(sessionId);
  }

  async updateSessionMetadata(sessionId: string, partial: Partial<SessionMetadata>): Promise<void> {
    return this.sessions.updateMetadata(sessionId, partial);
  }

  async readConfig(): Promise<AppConfig | null> {
    return this.config.read();
  }

  async updateConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
    return this.config.update(partial);
  }
}

let storageInstance: FileSystemStorage | null = null;

export function getStorage(projectRoot?: string): FileSystemStorage {
  if (storageInstance) return storageInstance;

  const root = projectRoot ?? path.join(os.homedir(), '.mint');
  const dataDir = root;
  const sessionsDir = path.join(dataDir, 'sessions');

  storageInstance = new FileSystemStorage(dataDir, sessionsDir);
  return storageInstance;
}
