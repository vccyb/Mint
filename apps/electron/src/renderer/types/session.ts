export type Mode = 'chat' | 'agent';

export interface SessionConfig {
  model: string;
  systemPrompt?: string;
}

export interface SessionState {
  id: string;
  mode: 'chat' | 'agent';
  messages: import('./message').ChatMessage[];
  isStreaming: boolean;
  config: SessionConfig;
}

export interface SessionResult {
  success: boolean;
  sessionId: string;
  error?: string;
  costUsd?: number;
  durationMs?: number;
  numTurns?: number;
  tokens?: number;
}
