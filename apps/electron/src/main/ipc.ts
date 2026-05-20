import { ipcMain, BrowserWindow, shell } from 'electron';
import { getStorage } from './lib/storage';
import { DEFAULT_MODEL } from './lib/constants';
import { createLogger } from './lib/logger';
import { sendChat, abortChat, type ChatInput } from './lib/chat-service';
import { sendAgent, abortAgent, answerPermission, type AgentInput } from './lib/agent-service';
import { listSkills, toggleSkill, createSkill as createSkillIo, getSkillContent } from './lib/storage/skills';
import { loadMcpConfig, saveMcpConfig, addMcpServer, removeMcpServer, toggleMcpServer } from './lib/storage/mcp-config';
import {
  SESSION_IPC,
  CONFIG_IPC,
  CHAT_IPC,
  AGENT_IPC,
  GROUPS_IPC,
  PROJECTS_IPC,
  SKILLS_IPC,
  MCP_IPC,
  TOOLS_IPC,
  LOGS_IPC,
  THREADS_IPC,
  SESSION_FILES_IPC,
  FILESYSTEM_IPC,
  FILES_IPC,
  STT_IPC,
  SYSTEM_IPC,
  NOTIFICATION_IPC,
  UPDATE_IPC,
} from '../types/ipc-channels';
import type { Mode } from '../../types';
import { onStreamStarted, onStreamEnded } from './stream-notifier';
import { checkForUpdates, downloadAndInstallUpdate, onUpdateStatus } from './updater';

const log = createLogger('ipc');

export function registerIpcHandlers() {
  // ─── 基础 ───
  ipcMain.handle('ping', () => 'pong');

  // ─── 会话 ───
  ipcMain.handle(SESSION_IPC.LIST, async (_, mode?: string) => {
    const storage = getStorage();
    await storage.initialize();
    let sessions = await storage.listSessions();
    if (mode) {
      sessions = sessions.filter((s) => s.mode === mode);
    }
    return sessions;
  });

  ipcMain.handle(SESSION_IPC.GET, async (_, id: string) => {
    const storage = getStorage();
    await storage.initialize();
    const result = await storage.readSession(id);
    return result;
  });

  ipcMain.handle(SESSION_IPC.CREATE, async (_, input: { mode?: Mode; projectId?: string; title?: string }) => {
    const { mode = 'chat', projectId, title } = input;
    const storage = getStorage();
    await storage.initialize();

    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const sessionMetadata = {
      id: sessionId,
      title: title ?? '新对话',
      mode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      model: DEFAULT_MODEL,
      ...(projectId && { projectId }),
    };

    await storage.createSession(sessionMetadata);

    if (projectId) {
      await storage.projects.moveSessionToProject(sessionId, projectId);
    }

    return sessionMetadata;
  });

  ipcMain.handle(SESSION_IPC.DELETE, async (_, id: string) => {
    const storage = getStorage();
    await storage.initialize();
    await storage.deleteSession(id);
    return { ok: true };
  });

  ipcMain.handle(SESSION_IPC.UPDATE, async (_, id: string, data: Record<string, unknown>) => {
    const storage = getStorage();
    await storage.initialize();
    await storage.updateSessionMetadata(id, data as Record<string, unknown>);
    return { ok: true };
  });

  ipcMain.handle(SESSION_IPC.FORK, async (_, id: string, messageId: string) => {
    const storage = getStorage();
    await storage.initialize();
    const count = await storage.truncateAfterMessage(id, messageId);
    return { success: true, messageCount: count };
  });

  ipcMain.handle(SESSION_IPC.AUTO_TITLE, async (_, input: { sessionId: string; messages: unknown[] }) => {
    const { sessionId, messages } = input;
    const msgs = messages as Array<{ role: string; content: string }>;
    const firstUserMsg = msgs.find((m) => m.role === 'user');
    let title = '新对话';
    if (firstUserMsg) {
      title = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
    }
    const storage = getStorage();
    await storage.initialize();
    await storage.updateSessionMetadata(sessionId, { title });
    return { title };
  });

  // ─── 配置 ───
  ipcMain.handle(CONFIG_IPC.READ, async () => {
    const storage = getStorage();
    await storage.initialize();
    const config = await storage.readConfig();
    return config ?? {};
  });

  ipcMain.handle(CONFIG_IPC.UPDATE, async (_, data: Record<string, unknown>) => {
    const storage = getStorage();
    await storage.initialize();
    const updated = await storage.updateConfig(data);
    return updated;
  });

  // ─── 分组 ───
  ipcMain.handle(GROUPS_IPC.LIST, async () => {
    const storage = getStorage();
    await storage.initialize();
    return storage.groups.read();
  });

  ipcMain.handle(GROUPS_IPC.CREATE, async (_, input: { name: string }) => {
    const storage = getStorage();
    await storage.initialize();
    return storage.groups.addGroup(input.name);
  });

  ipcMain.handle(GROUPS_IPC.UPDATE, async (_, id: string, data: Record<string, unknown>) => {
    const storage = getStorage();
    await storage.initialize();
    if (data.sessionId) {
      await storage.groups.moveSessionToGroup(data.sessionId as string, id);
    } else {
      await storage.groups.updateGroup(id, data);
    }
    return { ok: true };
  });

  ipcMain.handle(GROUPS_IPC.DELETE, async (_, id: string) => {
    const storage = getStorage();
    await storage.initialize();
    await storage.groups.deleteGroup(id);
    return { ok: true };
  });

  // ─── 项目 ───
  ipcMain.handle(PROJECTS_IPC.LIST, async () => {
    const storage = getStorage();
    await storage.initialize();
    return storage.projects.list();
  });

  ipcMain.handle(PROJECTS_IPC.CREATE, async (_, input: { name: string; projectPath?: string }) => {
    const storage = getStorage();
    await storage.initialize();
    return storage.projects.create(input);
  });

  ipcMain.handle(PROJECTS_IPC.UPDATE, async (_, id: string, data: Record<string, unknown>) => {
    const storage = getStorage();
    await storage.initialize();
    await storage.projects.updateProject(id, data);
    return { ok: true };
  });

  ipcMain.handle(PROJECTS_IPC.DELETE, async (_, id: string) => {
    const storage = getStorage();
    await storage.projects.deleteProject(id);
    return { ok: true };
  });

  // ─── Skills ───
  ipcMain.handle(SKILLS_IPC.LIST, async () => {
    return listSkills();
  });

  ipcMain.handle(SKILLS_IPC.TOGGLE, async (_, input: { name: string }) => {
    const enabled = await toggleSkill(input.name);
    return { ok: true, enabled };
  });

  ipcMain.handle(SKILLS_IPC.SEARCH, async (_, input: { q: string }) => {
    const all = await listSkills();
    const q = input.q.toLowerCase();
    const results = all.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    return { results };
  });

  ipcMain.handle(SKILLS_IPC.GET, async (_, name: string) => {
    const { content, level } = await getSkillContent(name);
    return { name, content, level, enabled: true };
  });

  ipcMain.handle(SKILLS_IPC.CREATE, async (_, input: { name: string; description?: string; content?: string }) => {
    const meta = await createSkillIo(input.name, input.description ?? '', input.content ?? '');
    return { ok: true, ...meta };
  });

  ipcMain.handle(SKILLS_IPC.CONTENT, async (_, name: string) => {
    const { content } = await getSkillContent(name);
    return { content };
  });

  ipcMain.handle(SKILLS_IPC.OPEN, async (_, name: string) => {
    const path = await import('path');
    const os = await import('os');
    const skillPath = path.join(os.homedir(), '.mint', 'skills', name, 'SKILL.md');
    await shell.openPath(skillPath);
    return { ok: true };
  });

  // ─── MCP ───
  ipcMain.handle(MCP_IPC.READ_CONFIG, async () => {
    const configs = await loadMcpConfig();
    return { configs };
  });

  ipcMain.handle(MCP_IPC.UPDATE_CONFIG, async (_, data: Record<string, unknown>) => {
    if (data.deleteId) {
      await removeMcpServer(data.deleteId as string);
      return { ok: true };
    }
    if (data.id && !data.name && !data.command) {
      // Toggle by id
      await toggleMcpServer(data.id as string);
      return { ok: true };
    }
    if (data.name && data.command) {
      // Add new server
      const config = await addMcpServer({
        name: data.name as string,
        command: data.command as string,
        args: (data.args as string[]) || [],
        env: (data.env as Record<string, string>) || {},
      });
      return { config };
    }
    // Fallback: direct save
    const current = await loadMcpConfig();
    await saveMcpConfig(current);
    return { ok: true };
  });

  ipcMain.handle(MCP_IPC.TEST, async (_, _config: unknown) => {
    return { success: true, message: 'MCP test not yet implemented in Electron' };
  });

  // ─── Chat 流式 ───
  ipcMain.handle(CHAT_IPC.SEND, async (event, input: ChatInput) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No BrowserWindow found');
    // Fire and forget — events are pushed via webContents.send('chat:stream', ...)
    sendChat(win.webContents, input).catch((err) => {
      log.error('Chat send error', { error: err instanceof Error ? err.message : String(err) });
    });
    return { ok: true };
  });

  ipcMain.handle(CHAT_IPC.ABORT, async (_, sessionId: string) => {
    abortChat(sessionId);
    return { ok: true };
  });

  // ─── Agent 流式 ───
  ipcMain.handle(AGENT_IPC.SEND, async (event, input: AgentInput) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) throw new Error('No BrowserWindow found');
    sendAgent(win.webContents, input).catch((err) => {
      log.error('Agent send error', { error: err instanceof Error ? err.message : String(err) });
    });
    return { ok: true };
  });

  ipcMain.handle(AGENT_IPC.ANSWER, async (_, requestId: string, behavior: string, updatedInput?: Record<string, unknown>) => {
    const ok = answerPermission(requestId, behavior, updatedInput);
    return { ok };
  });

  ipcMain.handle(AGENT_IPC.ABORT, async (_, sessionId: string) => {
    abortAgent(sessionId);
    return { ok: true };
  });

  // ─── Tools ───
  ipcMain.handle(TOOLS_IPC.LIST, async () => {
    // 静态工具列表，后续可以从配置读取
    return { tools: [] as Array<{ name: string; category: 'native' | 'sdk' | 'mcp'; description: string }> };
  });

  // ─── Logs ───
  ipcMain.handle(LOGS_IPC.READ, async () => {
    // 后续接入 logger ring buffer
    return [];
  });

  // ─── Threads ───
  ipcMain.handle(THREADS_IPC.LIST, async (_, projectId?: string) => {
    const storage = getStorage();
    await storage.initialize();
    return storage.threads.list(projectId);
  });

  ipcMain.handle(THREADS_IPC.GET, async (_, id: string) => {
    const storage = getStorage();
    await storage.initialize();
    return storage.threads.get(id);
  });

  ipcMain.handle(THREADS_IPC.CHANGES, async (_, id: string) => {
    const storage = getStorage();
    await storage.initialize();
    return storage.threads.getFileChanges(id);
  });

  // ─── Session Files ───
  ipcMain.handle(SESSION_FILES_IPC.LIST, async (_, sessionId: string) => {
    const storage = getStorage();
    await storage.initialize();
    const files = await storage.sessionFiles.listFiles(sessionId);
    return { files };
  });

  ipcMain.handle(SESSION_FILES_IPC.GET_CONTENT, async (_, sessionId: string, fileId: string) => {
    const storage = getStorage();
    await storage.initialize();
    return { content: await storage.sessionFiles.getFileContent(sessionId, fileId) };
  });

  ipcMain.handle(SESSION_FILES_IPC.UPLOAD, async (_, sessionId: string, file: { name: string; data: string; mimeType?: string }) => {
    const storage = getStorage();
    await storage.initialize();
    const buffer = Buffer.from(file.data, 'base64');
    const fileRecord = {
      id: `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.mimeType ?? 'application/octet-stream',
      size: buffer.length,
      uploadedAt: Date.now(),
    };
    await storage.sessionFiles.addFile(sessionId, fileRecord, buffer);
    return fileRecord;
  });

  ipcMain.handle(SESSION_FILES_IPC.DELETE, async (_, sessionId: string, fileId: string) => {
    const storage = getStorage();
    await storage.initialize();
    await storage.sessionFiles.deleteFile(sessionId, fileId);
    return { ok: true };
  });

  // ─── Filesystem 浏览 ───
  ipcMain.handle(FILESYSTEM_IPC.BROWSE, async (_, dirPath?: string) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    const target = dirPath?.replace(/^~/, os.homedir()) ?? os.homedir();
    try {
      const entries = await fs.readdir(target, { withFileTypes: true });
      return {
        currentPath: target,
        parentPath: path.dirname(target) !== target ? path.dirname(target) : null,
        entries: entries
          .filter((e) => !e.name.startsWith('.') && e.isDirectory())
          .map((e) => ({ name: e.name, path: path.join(target, e.name) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch {
      return { currentPath: target, parentPath: null, entries: [] };
    }
  });

  // ─── Files (项目文件) ───
  ipcMain.handle(FILES_IPC.LIST, async (_, input?: { projectId?: string }) => {
    const storage = getStorage();
    await storage.initialize();
    const config = await storage.readConfig();
    const projectPath = input?.projectId
      ? (await storage.projects.getProject(input.projectId))?.projectPath
      : (config as Record<string, unknown>)?.projectPath as string | undefined;
    if (!projectPath) return { root: '', projectName: '', tree: [] };

    const fs = await import('fs/promises');
    const path = await import('path');
    type FileNode = { name: string; path: string; type: 'file' | 'directory'; children?: FileNode[] };
    async function walk(dir: string, depth: number): Promise<FileNode[]> {
      if (depth > 3) return [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const nodes: FileNode[] = [];
        for (const e of entries) {
          if (e.name.startsWith('.') || e.name === 'node_modules') continue;
          const fullPath = path.join(dir, e.name);
          if (e.isDirectory()) {
            const children = await walk(fullPath, depth + 1);
            nodes.push({ name: e.name, path: fullPath, type: 'directory', children });
          } else {
            nodes.push({ name: e.name, path: fullPath, type: 'file' });
          }
        }
        return nodes.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      } catch {
        return [];
      }
    }
    const tree = await walk(projectPath, 0);
    return { root: projectPath, projectName: path.basename(projectPath), tree };
  });

  ipcMain.handle(FILES_IPC.CHANGES, async (_, input?: { projectId?: string }) => {
    // Stub: changed files detection requires git integration
    return { files: [] as Array<{ path: string; status: string }> };
  });

  ipcMain.handle(FILES_IPC.CONTENT, async (_, input: { filePath: string }) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      const ext = path.extname(input.filePath).toLowerCase().replace('.', '');
      const buf = await fs.readFile(input.filePath);
      const size = buf.length;
      // Binary detection for common non-text extensions
      const binaryExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'pdf', 'zip', 'gz', 'tar', 'woff', 'woff2', 'ttf', 'eot', 'mp3', 'mp4', 'avi', 'mov']);
      if (binaryExts.has(ext)) {
        return { content: buf.toString('base64'), encoding: 'base64', size, mimeType: '' };
      }
      return { content: buf.toString('utf-8'), encoding: 'text', size, mimeType: '' };
    } catch {
      return { content: null, encoding: 'text', size: 0, mimeType: '' };
    }
  });

  ipcMain.handle(FILES_IPC.SEARCH, async (_, input: { q: string; projectId?: string }) => {
    const storage = getStorage();
    await storage.initialize();
    const config = await storage.readConfig();
    const projectPath = input.projectId
      ? (await storage.projects.getProject(input.projectId))?.projectPath
      : (config as Record<string, unknown>)?.projectPath as string | undefined;
    if (!projectPath) return { results: [] };

    const fs = await import('fs/promises');
    const path = await import('path');
    const q = input.q.toLowerCase();
    const results: Array<{ name: string; path: string; type: string }> = [];
    async function walk(dir: string, depth: number) {
      if (depth > 5 || results.length >= 50) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.') || e.name === 'node_modules') continue;
          const fullPath = path.join(dir, e.name);
          if (e.name.toLowerCase().includes(q)) {
            results.push({ name: e.name, path: fullPath, type: e.isDirectory() ? 'directory' : 'file' });
          }
          if (e.isDirectory()) await walk(fullPath, depth + 1);
        }
      } catch { /* ignore */ }
    }
    await walk(projectPath, 0);
    return { results };
  });

  // ─── STT (语音输入) ───
  ipcMain.handle(STT_IPC.START, async () => {
    // TODO: Integrate with Doubao ASR WebSocket in main process
    return { sessionId: `stt_${Date.now().toString(36)}`, error: undefined };
  });

  ipcMain.handle(STT_IPC.CHUNK, async (_, _input: { sessionId?: string; audio?: string; isLast?: boolean }) => {
    // TODO: Forward audio chunk to Doubao ASR and return transcribed text
    return { text: '', error: undefined };
  });

  ipcMain.handle(STT_IPC.CLOSE, async (_, _sessionId?: string) => {
    // TODO: Close STT session
    return { ok: true };
  });

  // ─── System Deps Check ───
  ipcMain.handle(SYSTEM_IPC.CHECK_DEPS, async () => {
    const cp = await import('child_process');
    const results: Record<string, { installed: boolean; version?: string }> = {};
    for (const cmd of ['node', 'git']) {
      try {
        // Use login shell to inherit user's full PATH (brew, nvm, etc.)
        const ver = cp.execSync(`/bin/zsh -l -c "${cmd} --version"`, { timeout: 8000, encoding: 'utf-8' }).trim();
        results[cmd] = { installed: true, version: ver };
      } catch {
        results[cmd] = { installed: false };
      }
    }
    return results;
  });

  // ─── Notifications ───
  ipcMain.handle(NOTIFICATION_IPC.STREAM_STARTED, async () => {
    onStreamStarted();
    return { ok: true };
  });

  ipcMain.handle(NOTIFICATION_IPC.STREAM_ENDED, async () => {
    onStreamEnded();
    return { ok: true };
  });

  // ─── Auto-Update ───
  ipcMain.handle(UPDATE_IPC.CHECK, async () => {
    return checkForUpdates();
  });

  ipcMain.handle(UPDATE_IPC.DOWNLOAD_AND_INSTALL, async () => {
    return downloadAndInstallUpdate();
  });

  onUpdateStatus((status) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send(UPDATE_IPC.ON_STATUS, status);
    }
  });

  log.info('IPC handlers registered');
}
