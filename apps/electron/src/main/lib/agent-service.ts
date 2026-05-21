/**
 * Agent streaming service for Electron main process.
 * Extracted from packages/mint/src/app/api/agent/route.ts.
 * Replaces SSE response with IPC events via webContents.send().
 */
import os from 'os';
import path from 'path';
import { promises as fs } from 'fs';
import { getStorage } from './storage';
import { generateId } from './utils';
import { createLogger } from './logger';
import { listSkills } from './storage/skills';
import { buildBuiltinAgents } from './builtin-agents';
import { buildDelegationPrompt } from './agent-prompt-builder';
import { buildSkillIndexPrompt } from './agent-stream';
import { AgentAdapter } from './agent-adapter';
import { AgentOrchestrator } from './agent-orchestrator';
import { resolveProjectPath } from './path-resolver';
import { readProjectContext } from './read-project-context';
import { DEFAULT_MODEL, DEFAULT_BASE_URL } from './constants';
import { resolvePending, type PermissionResult } from './permission-store';
import type { ChatMessage, Attachment, SessionFile, StreamEventData } from '../../types';

const log = createLogger('agent-service');

const orchestrator = new AgentOrchestrator();

/** Active abort controllers per session */
const activeControllers = new Map<string, AbortController>();

export interface AgentInput {
  message: string;
  sessionId?: string;
  attachments?: Attachment[];
  mentionedTools?: Array<{ type: string; label: string; value: string }>;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
  planApproval?: boolean;
  projectId?: string;
}

/**
 * Send an agent message and stream response via IPC events.
 */
export async function sendAgent(
  webContents: Electron.WebContents,
  input: AgentInput,
): Promise<void> {
  const {
    message,
    sessionId,
    attachments,
    mentionedTools,
    permissionMode,
    planApproval,
    projectId,
  } = input;

  const storage = getStorage();
  await storage.initialize();
  const config = await storage.readConfig();
  const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
  const baseUrl = config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? DEFAULT_BASE_URL;
  const model = config?.model ?? DEFAULT_MODEL;

  if (!apiKey) {
    webContents.send('agent:stream', {
      type: 'error',
      data: 'ANTHROPIC_API_KEY not configured',
      errorCode: 'AUTH_ERROR',
    } as StreamEventData);
    return;
  }

  const sid = sessionId ?? generateId();
  let isNewSession = false;
  if (!sessionId) {
    isNewSession = true;
    await storage.createSession({
      id: sid,
      title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
      mode: 'agent',
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
      ...(projectId && { projectId }),
    });
  }

  // Get projectId from session if not provided
  let effectiveProjectId = projectId;
  if (!effectiveProjectId && sessionId) {
    const sessions = await storage.listSessions();
    const session = sessions.find((s) => s.id === sessionId);
    effectiveProjectId = session?.projectId;
  }

  const cwd = await resolveProjectPath({
    projectId: effectiveProjectId,
    fallbackPath: process.env.MINT_CWD || process.cwd(),
  });

  // Save image attachments to disk
  const savedFilePaths = new Map<string, string>();
  if (attachments && attachments.length > 0) {
    const imageAttachments = attachments.filter((a) => a.type.startsWith('image/') && a.content);
    if (imageAttachments.length > 0) {
      const uploadDir = path.join(cwd, '.mint-uploads', sid);
      await fs.mkdir(uploadDir, { recursive: true });
      for (const a of imageAttachments) {
        const match = a.content!.match(/^data:[^;]+;base64,(.+)$/s);
        if (match) {
          const filePath = path.join(uploadDir, a.name);
          await fs.writeFile(filePath, Buffer.from(match[1], 'base64'));
          savedFilePaths.set(a.name, filePath);
        }
      }
    }
  }

  if (!planApproval) {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };
    await storage.appendMessage(sid, userMsg);

    if (attachments && attachments.length > 0) {
      const existingFiles = await storage.sessionFiles.listFiles(sid);
      const existingNames = new Set(existingFiles.map((f) => f.name));
      for (const a of attachments) {
        if (existingNames.has(a.name)) continue;
        const sf: SessionFile = {
          id: `sf_${generateId()}`,
          name: a.name,
          type: a.type,
          size: a.size,
          uploadedAt: Date.now(),
        };
        let fileContent = a.content ?? '';
        if (a.type.startsWith('image/') && fileContent.startsWith('data:')) {
          const base64Match = fileContent.match(/^data:[^;]+;base64,(.+)$/s);
          if (base64Match) fileContent = base64Match[1];
        }
        await storage.sessionFiles.addFile(sid, sf, fileContent);
      }
    }
  }

  // History
  const session = await storage.readSession(sid);
  const historyMessages = session.messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(0, planApproval ? undefined : -1)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  // Skills
  const skillPathMap = new Map<string, { name: string; description: string }>();
  let skillIndexPrompt = '';
  if (config?.skillsEnabled) {
    const allSkills = await listSkills();
    const activeSkills = allSkills.filter((s) => s.enabled);
    const builtinDir = path.join(process.cwd(), 'mint-skills');
    const userDir = path.join(os.homedir(), '.mint', 'skills');
    const skillEntries = activeSkills.map((s) => {
      const dir = s.level === 'builtin' ? builtinDir : userDir;
      const filePath = path.join(dir, s.name, 'SKILL.md');
      skillPathMap.set(filePath, { name: s.name, description: s.description });
      return { name: s.name, description: s.description, filePath };
    });
    skillIndexPrompt = buildSkillIndexPrompt(skillEntries);
  }

  // Mentioned tools
  let mentionedToolsPrompt = '';
  if (mentionedTools && mentionedTools.length > 0) {
    const lines = mentionedTools.map((t) => {
      if (t.type === 'file') return `  <file path="${t.value}" />`;
      return `  <tool type="${t.type}" name="${t.value}" />`;
    });
    mentionedToolsPrompt = [
      '<mentioned_tools>',
      ...lines,
      '</mentioned_tools>',
      '',
      'The user has explicitly referenced the above tools/files. You MUST use them when processing this request.',
    ].join('\n');
  }

  // Project context
  let projectContextPrompt = '';
  const projectContext = await readProjectContext(cwd);
  if (projectContext) {
    projectContextPrompt = `<project_context>\n${projectContext}\n</project_context>`;
  }

  // SubAgents
  const subAgents = buildBuiltinAgents();
  const delegationPrompt = buildDelegationPrompt(subAgents);
  const effectiveSystemPrompt = [
    config?.systemPrompt,
    projectContextPrompt,
    skillIndexPrompt,
    mentionedToolsPrompt,
    delegationPrompt,
  ]
    .filter(Boolean)
    .join('\n\n');

  // Session files
  const sessionFiles = await storage.sessionFiles.listFiles(sid);
  const sessionFileContents = new Map<string, string>();
  for (const sf of sessionFiles) {
    const content = await storage.sessionFiles.getFileContent(sid, sf.id);
    if (content) sessionFileContents.set(sf.id, String(content));
  }

  const permMode = (permissionMode ?? config?.permissionMode ?? 'default') as
    | 'bypassPermissions'
    | 'default'
    | 'plan';
  const isPlanMode = permMode === 'plan';
  const sandboxMode = config?.sandboxMode ?? 'workspace';

  // SDK env
  const nodeDir = path.dirname(process.execPath);
  const sdkEnv: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PATH: [nodeDir, process.env.PATH].filter(Boolean).join(path.delimiter),
    CLAUDE_CODE_ENABLE_TASKS: 'true',
  };
  if (apiKey) {
    sdkEnv.ANTHROPIC_API_KEY = apiKey;
    sdkEnv.ANTHROPIC_AUTH_TOKEN = apiKey;
  }
  if (baseUrl) {
    sdkEnv.ANTHROPIC_BASE_URL = baseUrl;
  }

  // Adapter
  const adapter = new AgentAdapter({
    model,
    apiKey,
    baseUrl,
    permissionMode: permMode,
    systemPrompt: effectiveSystemPrompt,
    agents: subAgents,
    env: sdkEnv,
    cwd,
    sandboxMode,
  });

  // Abort controller
  const abortController = new AbortController();
  activeControllers.set(sid, abortController);

  // SSE → IPC bridge: convert Uint8Array enqueue to direct webContents.send
  const enc = new TextEncoder();
  const emit = (event: StreamEventData) => {
    webContents.send('agent:stream', event);
  };

  // The orchestrator expects enqueue(data: Uint8Array) => boolean.
  // We create a bridge that parses SSE data and sends IPC events directly.
  const enqueue = (data: Uint8Array): boolean => {
    try {
      const text = new TextDecoder().decode(data);
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          const json = line.slice(6);
          const event = JSON.parse(json) as StreamEventData;
          emit(event);
        }
      }
      return true;
    } catch {
      return false;
    }
  };

  try {
    await orchestrator.runSession({
      sessionId: sid,
      prompt: message,
      historyMessages,
      attachments,
      isPlanMode,
      isNewSession,
      adapter,
      enqueue,
      storage,
      skillPathMap,
      skillsEnabled: config?.skillsEnabled ?? false,
      abortSignal: abortController.signal,
      sessionFiles,
      sessionFileContents,
      savedFilePaths,
    });
  } catch (err) {
    log.error('Agent run error', { error: err instanceof Error ? err.message : String(err) });
  } finally {
    activeControllers.delete(sid);
  }
}

/**
 * Abort an active agent session.
 */
export function abortAgent(sessionId: string): void {
  const controller = activeControllers.get(sessionId);
  if (controller) {
    controller.abort();
    activeControllers.delete(sessionId);
    log.info('Agent aborted', { sessionId });
  }
}

/**
 * Resolve a permission request from the renderer.
 */
export function answerPermission(
  requestId: string,
  behavior: string,
  updatedInput?: Record<string, unknown>,
): boolean {
  const result: PermissionResult =
    behavior === 'allow'
      ? { behavior: 'allow', updatedInput }
      : { behavior: 'deny', message: 'User denied permission' };
  return resolvePending(requestId, result);
}
