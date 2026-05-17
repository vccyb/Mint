import { query, type CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import { encodeSSE } from '@/lib/sse';
import { addPending, resolvePending } from '@/lib/permission-store';
import { createLogger } from '@/lib/logger';
import { READ_ONLY_TOOLS } from '@/lib/constants';
import type { SubAgentDefinition, StreamEventData } from '@/types';

const log = createLogger('lib.agent-adapter');

export interface AgentAdapterOptions {
  model: string;
  apiKey: string;
  baseUrl: string;
  permissionMode: 'bypassPermissions' | 'default' | 'plan';
  systemPrompt: string;
  agents: Record<string, SubAgentDefinition>;
  env: Record<string, string>;
  cwd: string;
}

/**
 * Wraps the Claude Agent SDK query() call.
 * Handles permission callbacks, query option construction, and abort management.
 *
 * Inspired by Proma's ClaudeAgentAdapter, simplified for Mint's server-side usage.
 */
export class AgentAdapter {
  private options: AgentAdapterOptions;
  private abortController: AbortController | null = null;

  constructor(options: AgentAdapterOptions) {
    this.options = options;
  }

  /** Build SDK query options with canUseTool permission callback. */
  buildQueryOptions(
    sessionId: string,
    enqueue: (data: Uint8Array) => boolean,
  ): Parameters<typeof query>[0]['options'] {
    log.info('Building query options', {
      sessionId,
      model: this.options.model,
      permissionMode: this.options.permissionMode,
    });
    const { model, permissionMode, systemPrompt, env, cwd, agents } = this.options;
    const encoder = new TextEncoder();
    const permMode = permissionMode;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentEntries: Record<string, any> = Object.fromEntries(
      Object.entries(agents).map(([key, def]) => [
        key,
        {
          description: def.description,
          prompt: def.prompt,
          ...(def.tools && { tools: def.tools }),
          ...(def.model && { model: def.model }),
        },
      ]),
    );

    return {
      model,
      permissionMode: permMode,
      includePartialMessages: true,
      env,
      cwd,
      agents: agentEntries,
      ...(systemPrompt ? { systemPrompt } : {}),
      canUseTool: (async (
        toolName: string,
        input: Record<string, unknown>,
        options: Parameters<CanUseTool>[2],
      ) => {
        if (permMode === 'bypassPermissions') {
          log.debug('Permission check', {
            toolName,
            behavior: 'allow',
            reason: 'bypassPermissions',
          });
          return { behavior: 'allow' as const, updatedInput: input };
        }
        if (permMode === 'plan') {
          log.debug('Permission check', { toolName, behavior: 'deny', reason: 'plan mode' });
          return { behavior: 'deny' as const };
        }

        if (toolName === 'AskUserQuestion' || !READ_ONLY_TOOLS.includes(toolName)) {
          const requestId = `perm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const permEvent: StreamEventData = {
            type: 'permission_request',
            data: '',
            sessionId,
            requestId,
            toolName,
            toolArgs: input,
            decisionReason: options.decisionReason,
          };
          enqueue(encoder.encode(encodeSSE(permEvent)));

          const pending = addPending(requestId, toolName, options.toolUseID);
          if (options.signal) {
            options.signal.addEventListener(
              'abort',
              () =>
                resolvePending(requestId, {
                  behavior: 'deny' as const,
                  message: 'Request aborted',
                }),
              { once: true },
            );
          }
          return pending;
        }

        return { behavior: 'allow' as const, updatedInput: input };
      }) as CanUseTool,
    };
  }

  /** Execute an SDK query and return the async iterable. */
  executeQuery(
    prompt: string,
    queryOptions: Parameters<typeof query>[0]['options'],
  ): AsyncIterable<any> {
    log.info('Executing SDK query');
    this.abortController = new AbortController();
    return query({ prompt, options: { ...queryOptions, abortController: this.abortController } });
  }

  /** Resume an existing SDK session with a follow-up prompt. */
  resumeQuery(
    prompt: string,
    sdkSessionId: string,
    queryOptions: Parameters<typeof query>[0]['options'],
  ): AsyncIterable<any> {
    log.info('Resuming SDK query', { sdkSessionId });
    return query({
      prompt,
      options: {
        ...queryOptions,
        resume: sdkSessionId,
        abortController: this.abortController ?? undefined,
      },
    });
  }

  /** Abort the current query. */
  abort(): void {
    if (this.abortController) {
      log.info('Aborting query');
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
