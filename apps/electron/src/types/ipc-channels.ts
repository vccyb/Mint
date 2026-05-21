// IPC 通道常量 — 参照 Proma 的 @proma/shared 模式

export const SESSION_IPC = {
  LIST: 'session:list',
  GET: 'session:get',
  CREATE: 'session:create',
  DELETE: 'session:delete',
  UPDATE: 'session:update',
  FORK: 'session:fork',
  AUTO_TITLE: 'session:auto-title',
} as const;

export const CONFIG_IPC = {
  READ: 'config:read',
  UPDATE: 'config:update',
} as const;

export const CHAT_IPC = {
  SEND: 'chat:send',
  ABORT: 'chat:abort',
  STREAM: 'chat:stream',
} as const;

export const AGENT_IPC = {
  SEND: 'agent:send',
  ANSWER: 'agent:answer',
  ABORT: 'agent:abort',
  STREAM: 'agent:stream',
} as const;

export const STT_IPC = {
  START: 'stt:start',
  CHUNK: 'stt:chunk',
  CLOSE: 'stt:close',
} as const;

export const FILES_IPC = {
  LIST: 'files:list',
  CONTENT: 'files:content',
  CHANGES: 'files:changes',
  DIFF: 'files:diff',
  SEARCH: 'files:search',
} as const;

export const FILESYSTEM_IPC = {
  BROWSE: 'filesystem:browse',
} as const;

export const GROUPS_IPC = {
  LIST: 'groups:list',
  CREATE: 'groups:create',
  UPDATE: 'groups:update',
  DELETE: 'groups:delete',
} as const;

export const PROJECTS_IPC = {
  LIST: 'projects:list',
  CREATE: 'projects:create',
  UPDATE: 'projects:update',
  DELETE: 'projects:delete',
} as const;

export const SKILLS_IPC = {
  LIST: 'skills:list',
  GET: 'skills:get',
  CREATE: 'skills:create',
  TOGGLE: 'skills:toggle',
  CONTENT: 'skills:content',
  OPEN: 'skills:open',
  SEARCH: 'skills:search',
} as const;

export const MCP_IPC = {
  READ_CONFIG: 'mcp:readConfig',
  UPDATE_CONFIG: 'mcp:updateConfig',
  TEST: 'mcp:test',
} as const;

export const TOOLS_IPC = {
  LIST: 'tools:list',
} as const;

export const LOGS_IPC = {
  READ: 'logs:read',
} as const;

export const THREADS_IPC = {
  LIST: 'threads:list',
  GET: 'threads:get',
  CHANGES: 'threads:changes',
} as const;

export const SESSION_FILES_IPC = {
  LIST: 'sessionFiles:list',
  UPLOAD: 'sessionFiles:upload',
  GET_CONTENT: 'sessionFiles:getContent',
  DELETE: 'sessionFiles:delete',
} as const;

export const SYSTEM_IPC = {
  CHECK_DEPS: 'system:checkDeps',
} as const;

export const SUGGESTIONS_IPC = {
  GENERATE: 'suggestions:generate',
} as const;

export const NOTIFICATION_IPC = {
  STREAM_STARTED: 'notification:streamStarted',
  STREAM_ENDED: 'notification:streamEnded',
} as const;

export const UPDATE_IPC = {
  CHECK: 'update:check',
  DOWNLOAD_AND_INSTALL: 'update:downloadAndInstall',
  ON_STATUS: 'update:onStatus',
} as const;

export const MENU_IPC = {
  ON_ACTION: 'menu:onAction',
} as const;

export const TERMINAL_IPC = {
  CREATE: 'terminal:create',
  KILL: 'terminal:kill',
  INPUT: 'terminal:input',
  RESIZE: 'terminal:resize',
  DATA: 'terminal:data',
  EXIT: 'terminal:exit',
} as const;
