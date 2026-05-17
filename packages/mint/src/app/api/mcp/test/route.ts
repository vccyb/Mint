import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import type { McpConnectionTestResult } from '@/types/mcp';
import { withLogging } from '@/lib/with-logging';

export const POST = withLogging('api.mcp.test', async (request) => {
  const { command, args, env } = (await request.json()) as {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };

  if (!command) {
    return NextResponse.json({ error: 'Command is required' }, { status: 400 });
  }

  const startMs = Date.now();

  const result = await new Promise<McpConnectionTestResult>((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      resolve({
        status: 'error',
        tools: [],
        error: 'Connection timed out (10s)',
        latencyMs: Date.now() - startMs,
      });
    }, 10_000);

    const procEnv = { ...process.env, ...env };
    const proc = spawn(command, args ?? [], {
      env: procEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Send JSON-RPC initialize request
    const initRequest =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'mint', version: '1.0.0' },
        },
      }) + '\n';

    try {
      proc.stdin.write(initRequest);
    } catch {
      // stdin may be closed
    }

    // After a short delay, send tools/list
    setTimeout(() => {
      const toolsRequest =
        JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        }) + '\n';
      try {
        proc.stdin.write(toolsRequest);
      } catch {
        // stdin may be closed
      }
    }, 500);

    // Wait for response, then kill
    setTimeout(() => {
      clearTimeout(timeout);
      proc.kill();

      const tools: Array<{ name: string; description: string }> = [];

      // Parse JSON-RPC responses from stdout
      for (const line of stdout.split('\n')) {
        try {
          const parsed = JSON.parse(line);
          if (parsed?.result?.tools) {
            for (const tool of parsed.result.tools) {
              tools.push({
                name: tool.name ?? 'unknown',
                description: tool.description ?? '',
              });
            }
          }
        } catch {
          // Not JSON, skip
        }
      }

      resolve({
        status: tools.length > 0 || stdout.length > 0 ? 'connected' : 'error',
        tools,
        error: tools.length === 0 && stderr ? stderr.slice(0, 500) : undefined,
        latencyMs: Date.now() - startMs,
      });
    }, 3000);
  });

  return NextResponse.json(result);
});
