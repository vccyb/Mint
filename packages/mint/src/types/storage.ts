import type { ChatMessage } from './message';

export interface SessionMetadata {
  id: string;
  title: string;
  mode: 'chat' | 'agent';
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  model: string;
  pinned?: boolean;
  pinnedAt?: number;
}

export interface SessionRecord {
  type: 'metadata' | 'message';
  metadata?: SessionMetadata;
  message?: ChatMessage;
}

export interface StorageAdapter {
  initialize(): Promise<void>;
  createSession(metadata: SessionMetadata): Promise<void>;
  appendMessage(sessionId: string, message: ChatMessage): Promise<void>;
  readSession(sessionId: string): Promise<{ metadata: SessionMetadata; messages: ChatMessage[] }>;
  listSessions(): Promise<SessionMetadata[]>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionMetadata(sessionId: string, partial: Partial<SessionMetadata>): Promise<void>;
}
