import os from 'os';
import path from 'path';
import { getStorage } from '@/lib/storage';
import { createSSEResponse } from '@/lib/sse';
import { generateId } from '@/lib/utils';
import { createRequestLogger } from '@/lib/logger';
import { listSkills } from '@/lib/storage/skills';
import { buildBuiltinAgents } from '@/lib/builtin-agents';
import { buildDelegationPrompt } from '@/lib/agent-prompt-builder';
import { buildSkillIndexPrompt } from '@/lib/agent-stream';
import { AgentAdapter } from '@/lib/agent-adapter';
import { AgentOrchestrator } from '@/lib/agent-orchestrator';
import { resolveProjectPath } from '@/lib/path-resolver';
import { DEFAULT_MODEL, DEFAULT_BASE_URL } from '@/lib/constants';
import type { ChatMessage, Attachment } from '@/types';

const orchestrator = new AgentOrchestrator();

export async function POST(request: Request) {
  const reqId = generateId();
  const log = createRequestLogger('api.agent', reqId);

  try {
    const {
      message, sessionId, attachments, mentionedTools, permissionMode, planApproval, projectId,
    } = (await request.json()) as {
      message: string;
      sessionId?: string;
      attachments?: Attachment[];
      mentionedTools?: Array<{ type: string; label: string; value: string }>;
      permissionMode?: 'bypassPermissions' | 'default' | 'plan';
      planApproval?: boolean;
      projectId?: string;
    };

    log.info('Agent request received', {
      messageLength: message.length,
      sessionId: sessionId ?? 'new',
      permissionMode: permissionMode ?? 'default',
    });

    // --- Config & credentials ---
    const storage = getStorage();
    await storage.initialize();
    const config = await storage.readConfig();
    const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = config?.baseUrl ?? process.env.ANTHROPIC_BASE_URL ?? DEFAULT_BASE_URL;
    const model = config?.model ?? DEFAULT_MODEL;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Session management ---
    const sid = sessionId ?? generateId();
    let isNewSession = false;
    if (!sessionId) {
      isNewSession = true;
      await storage.createSession({
        id: sid,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        mode: 'agent', model, createdAt: Date.now(), updatedAt: Date.now(), messageCount: 0,
        ...(projectId && { projectId }),
      });
    }

    // Get projectId from session if not provided
    let effectiveProjectId = projectId;
    if (!effectiveProjectId && sessionId) {
      const sessions = await storage.listSessions();
      const session = sessions.find(s => s.id === sessionId);
      effectiveProjectId = session?.projectId;
    }

    // Resolve working directory based on project
    const cwd = await resolveProjectPath({
      projectId: effectiveProjectId,
      fallbackPath: process.env.MINT_CWD || process.cwd(),
    });

    if (!planApproval) {
      const userMsg: ChatMessage = {
        id: generateId(), role: 'user', content: message, timestamp: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };
      await storage.appendMessage(sid, userMsg);
    }

    // --- History ---
    const session = await storage.readSession(sid);
    const historyMessages = session.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, planApproval ? undefined : -1)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // --- Skills ---
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

    // --- Mentioned tools ---
    let mentionedToolsPrompt = '';
    if (mentionedTools && mentionedTools.length > 0) {
      const lines = mentionedTools.map((t) => {
        if (t.type === 'file') return `  <file path="${t.value}" />`;
        return `  <tool type="${t.type}" name="${t.value}" />`;
      });
      mentionedToolsPrompt = [
        '<mentioned_tools>', ...lines, '</mentioned_tools>', '',
        'The user has explicitly referenced the above tools/files. You MUST use them when processing this request.',
      ].join('\n');
    }

    // --- SubAgents & delegation prompt ---
    const subAgents = buildBuiltinAgents();
    const delegationPrompt = buildDelegationPrompt(subAgents);
    const effectiveSystemPrompt = [skillIndexPrompt, mentionedToolsPrompt, delegationPrompt]
      .filter(Boolean).join('\n\n');

    const permMode = (permissionMode ?? config?.permissionMode ?? 'default') as 'bypassPermissions' | 'default' | 'plan';
    const isPlanMode = permMode === 'plan';

    // --- SDK env ---
    // Preserve full process.env and prepend the current node binary's directory
    // to PATH so the SDK's spawn("node", ...) always resolves correctly.
    const nodeDir = path.dirname(process.execPath);
    const sdkEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
      PATH: [nodeDir, process.env.PATH].filter(Boolean).join(path.delimiter),
      CLAUDE_CODE_ENABLE_TASKS: 'true',
    };
    if (apiKey) { sdkEnv.ANTHROPIC_API_KEY = apiKey; sdkEnv.ANTHROPIC_AUTH_TOKEN = apiKey; }
    if (baseUrl) { sdkEnv.ANTHROPIC_BASE_URL = baseUrl; }

    // --- Adapter ---
    const adapter = new AgentAdapter({
      model, apiKey, baseUrl, permissionMode: permMode,
      systemPrompt: effectiveSystemPrompt, agents: subAgents,
      env: sdkEnv, cwd,
    });

    // --- Stream ---
    const stream = new ReadableStream({
      async start(controller) {
        let streamClosed = false;
        function safeEnqueue(data: Uint8Array): boolean {
          if (streamClosed) return false;
          try { controller.enqueue(data); return true; } catch { streamClosed = true; return false; }
        }

        try {
          await orchestrator.runSession({
            sessionId: sid, prompt: message, historyMessages,
            attachments, isPlanMode, isNewSession,
            adapter, enqueue: safeEnqueue, storage,
            skillPathMap, skillsEnabled: config?.skillsEnabled ?? false,
            abortSignal: request.signal,
          });
        } finally {
          streamClosed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return createSSEResponse(stream);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    log.error('Unhandled agent error', { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
