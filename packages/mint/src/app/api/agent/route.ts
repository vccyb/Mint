import { query, type CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import os from 'os';
import path from 'path';
import { getStorage } from '@/lib/storage';
import { encodeSSE, createSSEResponse } from '@/lib/sse';
import { generateId } from '@/lib/utils';
import { createRequestLogger } from '@/lib/logger';
import { classifyError } from '@/lib/classify-error';
import { listSkills } from '@/lib/storage/skills';
import { addPending, resolvePending } from '@/lib/permission-store';
import type { ChatMessage, StreamEventData, ToolCallInfo, SkillLoadInfo, Attachment, TodoItem } from '@/types';

const MAX_ATTACHMENT_SIZE = 1024 * 1024; // 1MB server-side safety net

/**
 * Phase 1: Build a lightweight skill index (name + description + file path).
 * Phase 2: When agent actually reads a SKILL.md, emit skill_load event.
 */
function buildSkillIndexPrompt(
  skills: { name: string; description: string; filePath: string }[],
): string {
  if (skills.length === 0) return '';

  const lines = skills.map((s) => {
    return `- **${s.name}**: ${s.description} → \`${s.filePath}\``;
  });

  return [
    '# Available Skills',
    '',
    'You have access to the following skills. Each skill is a SKILL.md file with detailed instructions.',
    '',
    'When a user request matches a skill, use your **Read** tool to load the file, then follow its instructions.',
    'Only load skills that are relevant to the current request — do NOT preload all skills.',
    '',
    ...lines,
    '',
    'Skill files are located at the paths shown above. Use the Read tool with the exact path to load a skill.',
  ].join('\n');
}

function isSkillRead(
  toolName: string,
  args: Record<string, unknown>,
  skillPathMap: Map<string, { name: string; description: string }>,
): { name: string; description: string } | null {
  if (toolName !== 'Read' && toolName !== 'file') return null;
  const filePath = (args.file_path ?? args.filePath ?? '') as string;
  if (!filePath) return null;

  // Normalize path separators and check if it ends with SKILL.md
  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized.endsWith('SKILL.md')) return null;

  // Check all known skill paths
  for (const [skillPath, info] of skillPathMap) {
    const normalizedSkillPath = skillPath.replace(/\\/g, '/');
    if (normalized === normalizedSkillPath || normalized.endsWith('/' + normalizedSkillPath)) {
      return info;
    }
  }

  // Fallback: extract skill name from path pattern */skills/<name>/SKILL.md
  const match = normalized.match(/\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    const name = match[1];
    const info = skillPathMap.get(name);
    return info ? { name: info.name, description: info.description } : { name, description: '' };
  }

  return null;
}

export async function POST(request: Request) {
  const reqId = generateId();
  const log = createRequestLogger('agent-route', reqId);

  try {
    const { message, sessionId, attachments, mentionedTools, permissionMode, planApproval } = (await request.json()) as {
      message: string;
      sessionId?: string;
      attachments?: Attachment[];
      mentionedTools?: Array<{ type: string; label: string; value: string }>;
      permissionMode?: 'bypassPermissions' | 'default' | 'plan';
      planApproval?: boolean;
    };

    log.info('Agent request received', {
      messageLength: message.length,
      sessionId: sessionId ?? 'new',
      attachmentCount: attachments?.length ?? 0,
      permissionMode: permissionMode ?? 'default',
      planApproval: planApproval ?? false,
    });

    const storage = getStorage();
    await storage.initialize();

    const config = await storage.readConfig();
    const apiKey =
      config?.apiKey ??
      process.env.ANTHROPIC_API_KEY ??
      process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl =
      config?.baseUrl ??
      process.env.ANTHROPIC_BASE_URL ??
      'https://open.bigmodel.cn/api/anthropic';
    const model = config?.model ?? 'glm-5.1';

    if (!apiKey) {
      log.warn('API key not configured');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const sdkEnv: Record<string, string> = {
      PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
      HOME: process.env.HOME ?? '',
    };
    if (apiKey) {
      sdkEnv.ANTHROPIC_API_KEY = apiKey;
      sdkEnv.ANTHROPIC_AUTH_TOKEN = apiKey;
    }
    if (baseUrl) {
      sdkEnv.ANTHROPIC_BASE_URL = baseUrl;
    }

    const sid = sessionId ?? generateId();
    let isNewSession = false;

    if (!sessionId) {
      isNewSession = true;
      await storage.createSession({
        id: sid,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        mode: 'agent',
        model: model,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
      });
    }

    // Save user message (skip if this is a plan approval re-execution)
    if (!planApproval) {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };
      await storage.appendMessage(sid, userMsg);
    }

    // Build messages array — reload session
    const session = await storage.readSession(sid);
    const historyMessages = session.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, planApproval ? undefined : -1) // exclude newly appended userMsg unless plan approval
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Load skill index if enabled (lightweight — just names + descriptions)
    let skillIndexPrompt = '';
    const skillPathMap = new Map<string, { name: string; description: string }>();

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

    // Build mentioned tools prompt
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

    const fullSystemPrompt = [skillIndexPrompt, mentionedToolsPrompt].filter(Boolean).join('\n\n');

    const permMode = (permissionMode ?? config?.permissionMode ?? 'default') as 'bypassPermissions' | 'default' | 'plan';
    const isPlanMode = permMode === 'plan';

    log.info('Provider configured', {
      model,
      hasApiKey: !!apiKey,
      baseUrl: baseUrl.replace(/\/\/[^/]+/, '//***'),
      permissionMode: permMode,
      planApproval: planApproval ?? false,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let assistantContent = '';
        let thinkingContent = '';
        const toolCalls: ToolCallInfo[] = [];
        const skillLoads: SkillLoadInfo[] = [];

        let currentToolId: string | null = null;
        let currentToolName: string | null = null;
        let currentToolInput = '';
        const todoWriteToolIds: Set<string> = new Set();
        let latestTodos: TodoItem[] = [];

        // Send initial session event
        const initEvent: StreamEventData = {
          type: 'content',
          data: '',
          sessionId: sid,
          isPlanMode,
        };
        controller.enqueue(encoder.encode(encodeSSE(initEvent)));

        try {
          let promptWithContext = message;

          // Prepend conversation history for multi-turn context
          if (historyMessages) {
            promptWithContext = `[Previous conversation]\n${historyMessages}\n[End of previous conversation]\n\nUser: ${message}`;
          }

          // Prepend attachment contents to prompt
          if (attachments && attachments.length > 0) {
            const attachmentParts = attachments
              .filter((a) => a.content && a.size <= MAX_ATTACHMENT_SIZE)
              .map((a) => {
                if (a.type.startsWith('image/')) {
                  return `[Image: ${a.name}]`;
                }
                return `[File: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``;
              });
            if (attachmentParts.length > 0) {
              promptWithContext =
                attachmentParts.join('\n\n') +
                '\n\n' +
                promptWithContext;
            }
          }

          const queryOptions: Parameters<typeof query>[0]['options'] = {
            model: model,
            permissionMode: permMode,
            includePartialMessages: true,
            env: sdkEnv,
            cwd: process.env.MINT_CWD || process.cwd(),
            ...(fullSystemPrompt ? { systemPrompt: fullSystemPrompt } : {}),
            canUseTool: (async (toolName: string, input: Record<string, unknown>, options: Parameters<CanUseTool>[2]) => {
              // bypassPermissions: auto-approve everything
              if (permMode === 'bypassPermissions') {
                return { behavior: 'allow' as const, updatedInput: input };
              }

              // plan mode: deny all tool execution (SDK should handle this internally,
              // but deny as safety net)
              if (permMode === 'plan') {
                return { behavior: 'deny' as const };
              }

              // default mode: AskUserQuestion goes through permission flow
              if (toolName === 'AskUserQuestion') {
                const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

                const permEvent: StreamEventData = {
                  type: 'permission_request',
                  data: '',
                  sessionId: sid,
                  requestId,
                  toolName,
                  toolArgs: input,
                  decisionReason: options.decisionReason,
                };
                controller.enqueue(encoder.encode(encodeSSE(permEvent)));

                const pending = addPending(requestId, toolName, options.toolUseID);

                if (options.signal) {
                  options.signal.addEventListener('abort', () => {
                    resolvePending(requestId, {
                      behavior: 'deny' as const,
                      message: 'Request aborted',
                    });
                  }, { once: true });
                }

                return pending;
              }

              // default mode: read-only tools auto-approve, write tools need confirmation
              const READ_ONLY_TOOLS = ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TaskOutput', 'Agent', 'mcp__pencil__get_editor_state', 'mcp__pencil__batch_get'];
              if (READ_ONLY_TOOLS.includes(toolName)) {
                return { behavior: 'allow' as const, updatedInput: input };
              }

              // Write tools in default mode: send permission request
              const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const permEvent: StreamEventData = {
                type: 'permission_request',
                data: '',
                sessionId: sid,
                requestId,
                toolName,
                toolArgs: input,
                decisionReason: options.decisionReason,
              };
              controller.enqueue(encoder.encode(encodeSSE(permEvent)));

              const pending = addPending(requestId, toolName, options.toolUseID);

              if (options.signal) {
                options.signal.addEventListener('abort', () => {
                  resolvePending(requestId, {
                    behavior: 'deny' as const,
                    message: 'Request aborted',
                  });
                }, { once: true });
              }

              return pending;
            }) as CanUseTool,
          };

          const result = query({
            prompt: promptWithContext,
            options: queryOptions,
          });

          for await (const sdkMessage of result) {
            if (sdkMessage.type === 'stream_event') {
              const event = sdkMessage.event as {
                type: string;
                index?: number;
                delta?: {
                  type: string;
                  text?: string;
                  thinking?: string;
                  partial_json?: string;
                };
                content_block?: {
                  type: string;
                  name?: string;
                  id?: string;
                  input?: unknown;
                };
              };

              // Text streaming
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'text_delta'
              ) {
                const text = event.delta.text ?? '';
                assistantContent += text;
                const contentEvent: StreamEventData = {
                  type: 'content',
                  data: text,
                  sessionId: sid,
                };
                controller.enqueue(encoder.encode(encodeSSE(contentEvent)));
              }

              // Extended Thinking streaming
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'thinking_delta'
              ) {
                const text = event.delta.thinking ?? '';
                thinkingContent += text;
                const thinkingEvent: StreamEventData = {
                  type: 'thinking',
                  data: '',
                  sessionId: sid,
                  thinkingDelta: text,
                };
                controller.enqueue(encoder.encode(encodeSSE(thinkingEvent)));
              }

              // Tool use start
              if (
                event.type === 'content_block_start' &&
                event.content_block?.type === 'tool_use'
              ) {
                currentToolId = event.content_block.id ?? null;
                currentToolName = event.content_block.name ?? null;
                currentToolInput = '';
              }

              // Tool input delta
              if (
                event.type === 'content_block_delta' &&
                event.delta?.type === 'input_json_delta'
              ) {
                currentToolInput += event.delta.partial_json ?? '';
              }

              // Tool complete
              if (
                event.type === 'content_block_stop' &&
                currentToolId &&
                currentToolName
              ) {
                let parsedArgs: Record<string, unknown> = {};
                try {
                  parsedArgs = JSON.parse(currentToolInput || '{}');
                } catch {
                  parsedArgs = {};
                }

                if (currentToolName === 'TodoWrite') {
                  // Intercept TodoWrite: emit todo_update, skip tool_start/toolCalls
                  todoWriteToolIds.add(currentToolId);
                  const todos = (parsedArgs.todos ?? []) as TodoItem[];
                  latestTodos = todos;
                  const todoEvent: StreamEventData = {
                    type: 'todo_update',
                    data: '',
                    sessionId: sid,
                    todos,
                  };
                  controller.enqueue(encoder.encode(encodeSSE(todoEvent)));
                } else {
                  const toolInfo: ToolCallInfo = {
                    id: currentToolId,
                    name: currentToolName,
                    args: parsedArgs,
                    status: 'running',
                  };
                  toolCalls.push(toolInfo);

                  // Detect: is this a Read of a SKILL.md? → emit skill_load FIRST
                  if (config?.skillsEnabled) {
                    const matched = isSkillRead(currentToolName, parsedArgs, skillPathMap);
                    if (matched) {
                      skillLoads.push({ id: generateId(), name: matched.name, description: matched.description, status: 'loaded' });
                      const skillLoadEvent: StreamEventData = {
                        type: 'skill_load',
                        data: '',
                        sessionId: sid,
                        skillName: matched.name,
                        skillDescription: matched.description,
                      };
                      controller.enqueue(encoder.encode(encodeSSE(skillLoadEvent)));
                    }
                  }

                  // Then emit tool_start
                  const toolEvent: StreamEventData = {
                    type: 'tool_start',
                    data: '',
                    sessionId: sid,
                    toolName: currentToolName,
                    toolId: currentToolId,
                    toolArgs: parsedArgs,
                  };
                  controller.enqueue(encoder.encode(encodeSSE(toolEvent)));
                }

                currentToolId = null;
                currentToolName = null;
                currentToolInput = '';
              }
            } else if (sdkMessage.type === 'assistant') {
              // Nothing extra
            } else if (sdkMessage.type === 'user') {
              const msg = sdkMessage as {
                message?: {
                  content?: Array<{
                    type: string;
                    tool_use_id?: string;
                    content?: string;
                    is_error?: boolean;
                  }>;
                };
              };

              if (msg.message?.content) {
                for (const block of msg.message.content) {
                  if (block.type === 'tool_result' && block.tool_use_id) {
                    // Silently skip TodoWrite tool results
                    if (todoWriteToolIds.has(block.tool_use_id)) {
                      todoWriteToolIds.delete(block.tool_use_id);
                      continue;
                    }

                    const resultStr =
                      typeof block.content === 'string'
                        ? block.content
                        : JSON.stringify(block.content);
                    const isErr = block.is_error ?? false;

                    const tc = toolCalls.find(
                      (t) => t.id === block.tool_use_id,
                    );
                    if (tc) {
                      tc.result = resultStr;
                      tc.status = isErr ? 'error' : 'completed';
                    }

                    const toolResultEvent: StreamEventData = {
                      type: 'tool_result',
                      data: resultStr,
                      sessionId: sid,
                      toolId: block.tool_use_id,
                    };
                    controller.enqueue(
                      encoder.encode(encodeSSE(toolResultEvent)),
                    );
                  }
                }
              }
            } else if (sdkMessage.type === 'result') {
              const resultMsg = sdkMessage as {
                subtype?: string;
                result?: string;
                is_error?: boolean;
              };

              if (resultMsg.subtype === 'error' || resultMsg.is_error) {
                const rawError = resultMsg.result ?? 'Agent error';
                const classified = classifyError(rawError);
                const errorEvent: StreamEventData = {
                  type: 'error',
                  data: classified.userMessage,
                  sessionId: sid,
                  errorCode: classified.code,
                };
                controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
              }
            }
          }

          // Save assistant message with tool calls
          if (assistantContent || toolCalls.length > 0 || thinkingContent) {
            const assistantMsg: ChatMessage = {
              id: generateId(),
              role: 'assistant',
              content: assistantContent,
              timestamp: Date.now(),
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              skillLoads: skillLoads.length > 0 ? skillLoads : undefined,
              todos: latestTodos.length > 0 ? latestTodos : undefined,
              thinkingContent: thinkingContent || undefined,
              isPlanMode: isPlanMode || undefined,
            };
            await storage.appendMessage(sid, assistantMsg);

            if (isNewSession) {
              await storage.updateSessionMetadata(sid, {
                messageCount: 2,
              });
            } else {
              const session = await storage.readSession(sid);
              await storage.updateSessionMetadata(sid, {
                messageCount: session.messages.length,
              });
            }
          }

          // Send result
          log.info('Agent stream completed', {
            contentLength: assistantContent.length,
            hasThinking: !!thinkingContent,
            toolCallCount: toolCalls.length,
            skillLoadCount: skillLoads.length,
          });
          const resultEvent: StreamEventData = {
            type: 'result',
            data: JSON.stringify({
              role: 'assistant',
              content: assistantContent,
            }),
            sessionId: sid,
            isPlanMode: isPlanMode || undefined,
          };
          controller.enqueue(encoder.encode(encodeSSE(resultEvent)));
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : 'Agent error';
          log.error('Agent stream error', { error: errMsg });
          const classified = classifyError(errMsg);
          const errorEvent: StreamEventData = {
            type: 'error',
            data: classified.userMessage,
            sessionId: sid,
            errorCode: classified.code,
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        }

        controller.close();
      },
    });

    return createSSEResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    log.error('Unhandled agent error', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
