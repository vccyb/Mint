import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { ChatMessage, SessionMetadata, StorageAdapter } from '@/types';
import { ConfigStorage, type AppConfig } from './config';
import { SessionStorage } from './session';
import { GroupStorage } from './group';
import { ensureSkillsDirs } from './skills';
import { ProjectStorage } from './project';
import { ThreadStorage } from './thread';
import { SessionFileStorage } from './session-files';

export class FileSystemStorage implements StorageAdapter {
  public readonly config: ConfigStorage;
  public readonly sessions: SessionStorage;
  public readonly groups: GroupStorage;
  public readonly projects: ProjectStorage;
  public readonly threads: ThreadStorage;
  public readonly sessionFiles: SessionFileStorage;

  constructor(
    private dataDir: string,
    private sessionsDir: string,
  ) {
    this.config = new ConfigStorage(path.join(dataDir, 'config.json'));
    this.sessions = new SessionStorage(sessionsDir);
    this.groups = new GroupStorage(dataDir);
    this.projects = new ProjectStorage(dataDir);
    this.threads = new ThreadStorage(dataDir);
    this.sessionFiles = new SessionFileStorage(path.join(dataDir, 'session-files'));
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await ensureSkillsDirs();
    await this.projects.initialize();
    await this.threads.initialize();
    await this.sessionFiles.initialize();
  }

  async createSession(metadata: SessionMetadata): Promise<void> {
    return this.sessions.create(metadata);
  }

  async appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
    return this.sessions.append(sessionId, message);
  }

  async readSession(
    sessionId: string,
  ): Promise<{ metadata: SessionMetadata; messages: ChatMessage[] }> {
    return this.sessions.read(sessionId);
  }

  async listSessions(): Promise<SessionMetadata[]> {
    return this.sessions.list();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sessions.delete(sessionId);
    await this.sessionFiles.deleteAllFiles(sessionId);
  }

  async updateSessionMetadata(sessionId: string, partial: Partial<SessionMetadata>): Promise<void> {
    return this.sessions.updateMetadata(sessionId, partial);
  }

  async truncateAfterMessage(sessionId: string, messageId: string): Promise<number> {
    return this.sessions.truncateAfterMessage(sessionId, messageId);
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
