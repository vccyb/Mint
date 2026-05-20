import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // 基础
  ping: () => ipcRenderer.invoke('ping'),

  // 会话
  listSessions: (mode?: string) => ipcRenderer.invoke('session:list', mode),
  getSession: (id: string) => ipcRenderer.invoke('session:get', id),
  createSession: (input: Record<string, unknown>) => ipcRenderer.invoke('session:create', input),
  deleteSession: (id: string) => ipcRenderer.invoke('session:delete', id),
  updateSession: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('session:update', id, data),
  forkSession: (id: string, messageId: string) => ipcRenderer.invoke('session:fork', id, messageId),
  autoTitle: (input: Record<string, unknown>) => ipcRenderer.invoke('session:auto-title', input),

  // 配置
  readConfig: () => ipcRenderer.invoke('config:read'),
  updateConfig: (data: Record<string, unknown>) => ipcRenderer.invoke('config:update', data),

  // 分组
  listGroups: () => ipcRenderer.invoke('groups:list'),
  createGroup: (input: { name: string }) => ipcRenderer.invoke('groups:create', input),
  updateGroup: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('groups:update', id, data),
  deleteGroup: (id: string) => ipcRenderer.invoke('groups:delete', id),

  // 项目
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (input: { name: string; projectPath?: string }) => ipcRenderer.invoke('projects:create', input),
  updateProject: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('projects:update', id, data),
  deleteProject: (id: string) => ipcRenderer.invoke('projects:delete', id),

  // Skills
  listSkills: () => ipcRenderer.invoke('skills:list'),
  getSkill: (name: string) => ipcRenderer.invoke('skills:get', name),
  createSkill: (input: { name: string; description?: string; content?: string }) => ipcRenderer.invoke('skills:create', input),
  toggleSkill: (input: { name: string }) => ipcRenderer.invoke('skills:toggle', input),
  readSkillContent: (name: string) => ipcRenderer.invoke('skills:content', name),
  openSkill: (name: string) => ipcRenderer.invoke('skills:open', name),
  searchSkills: (input: { q: string }) => ipcRenderer.invoke('skills:search', input),

  // MCP
  readMcpConfig: () => ipcRenderer.invoke('mcp:readConfig'),
  updateMcpConfig: (data: Record<string, unknown>) => ipcRenderer.invoke('mcp:updateConfig', data),
  mcpTest: (config: unknown) => ipcRenderer.invoke('mcp:test', config),

  // Tools
  listTools: () => ipcRenderer.invoke('tools:list'),

  // Logs
  readLogs: () => ipcRenderer.invoke('logs:read'),

  // Threads
  listThreads: (projectId?: string) => ipcRenderer.invoke('threads:list', projectId),
  getThread: (id: string) => ipcRenderer.invoke('threads:get', id),
  getThreadChanges: (id: string) => ipcRenderer.invoke('threads:changes', id),

  // Session Files
  listSessionFiles: (sessionId: string) => ipcRenderer.invoke('sessionFiles:list', sessionId),
  getSessionFileContent: (sessionId: string, fileId: string) => ipcRenderer.invoke('sessionFiles:getContent', sessionId, fileId),
  sessionFilesUpload: (sessionId: string, file: { name: string; data: string; mimeType?: string }) =>
    ipcRenderer.invoke('sessionFiles:upload', sessionId, file),
  sessionFilesDelete: (sessionId: string, fileId: string) =>
    ipcRenderer.invoke('sessionFiles:delete', sessionId, fileId),

  // Filesystem 浏览
  browseFilesystem: (dirPath?: string) => ipcRenderer.invoke('filesystem:browse', dirPath),

  // Files (项目文件)
  filesList: (input?: { projectId?: string }) => ipcRenderer.invoke('files:list', input),
  filesChanges: (input?: { projectId?: string }) => ipcRenderer.invoke('files:changes', input),
  filesContent: (input: { filePath: string }) => ipcRenderer.invoke('files:content', input),
  filesSearch: (input: { q: string; projectId?: string }) => ipcRenderer.invoke('files:search', input),

  // STT (语音输入)
  sttStart: () => ipcRenderer.invoke('stt:start'),
  sttChunk: (input: { sessionId?: string; audio?: string; isLast?: boolean }) => ipcRenderer.invoke('stt:chunk', input),
  sttClose: (sessionId?: string) => ipcRenderer.invoke('stt:close', sessionId),

  // System deps
  checkSystemDeps: () => ipcRenderer.invoke('system:checkDeps'),

  // Chat 流式
  chatSend: (input: Record<string, unknown>) => ipcRenderer.invoke('chat:send', input),
  chatAbort: (sessionId: string) => ipcRenderer.invoke('chat:abort', sessionId),
  onChatStreamEvent: (callback: (event: unknown) => void) => {
    const handler = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on('chat:stream', handler);
    return () => ipcRenderer.removeListener('chat:stream', handler as Parameters<typeof ipcRenderer.removeListener>[1]);
  },

  // Agent 流式
  agentSend: (input: Record<string, unknown>) => ipcRenderer.invoke('agent:send', input),
  agentAnswer: (requestId: string, behavior: string, updatedInput?: Record<string, unknown>) =>
    ipcRenderer.invoke('agent:answer', requestId, behavior, updatedInput),
  agentAbort: (sessionId: string) => ipcRenderer.invoke('agent:abort', sessionId),
  onAgentStreamEvent: (callback: (event: unknown) => void) => {
    const handler = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on('agent:stream', handler);
    return () => ipcRenderer.removeListener('agent:stream', handler as Parameters<typeof ipcRenderer.removeListener>[1]);
  },

  // Notifications — renderer tells main process about streaming state
  notifyStreamStarted: () => ipcRenderer.invoke('notification:streamStarted'),
  notifyStreamEnded: () => ipcRenderer.invoke('notification:streamEnded'),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadAndInstallUpdate: () => ipcRenderer.invoke('update:downloadAndInstall'),
  onUpdateStatus: (callback: (status: unknown) => void) => {
    const handler = (_: unknown, status: unknown) => callback(status);
    ipcRenderer.on('update:onStatus', handler);
    return () => ipcRenderer.removeListener('update:onStatus', handler as Parameters<typeof ipcRenderer.removeListener>[1]);
  },

  // Menu actions — main process sends menu events to renderer
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_: unknown, action: string) => callback(action);
    ipcRenderer.on('menu:onAction', handler);
    return () => ipcRenderer.removeListener('menu:onAction', handler as Parameters<typeof ipcRenderer.removeListener>[1]);
  },
};

export type ElectronAPI = typeof api;

contextBridge.exposeInMainWorld('electronAPI', api);
