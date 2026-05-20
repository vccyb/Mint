interface ElectronAPI {
  ping(): Promise<string>;
  listSessions(mode?: string): Promise<any[]>;
  getSession(id: string): Promise<{ metadata: any; messages: any[] }>;
  createSession(input: Record<string, unknown>): Promise<any>;
  deleteSession(id: string): Promise<{ ok: boolean }>;
  updateSession(id: string, data: Record<string, unknown>): Promise<{ ok: boolean }>;
  forkSession(id: string, messageId: string): Promise<{ success: boolean; messageCount: number }>;
  autoTitle(input: Record<string, unknown>): Promise<{ title: string }>;
  readConfig(): Promise<any>;
  updateConfig(data: Record<string, unknown>): Promise<any>;
  chatSend(input: Record<string, unknown>): Promise<{ ok: boolean }>;
  chatAbort(sessionId: string): Promise<{ ok: boolean }>;
  onChatStreamEvent(callback: (event: unknown) => void): () => void;
  agentSend(input: Record<string, unknown>): Promise<{ ok: boolean }>;
  agentAnswer(
    requestId: string,
    behavior: string,
    updatedInput?: Record<string, unknown>,
  ): Promise<{ ok: boolean }>;
  agentAbort(sessionId: string): Promise<{ ok: boolean }>;
  onAgentStreamEvent(callback: (event: unknown) => void): () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}
