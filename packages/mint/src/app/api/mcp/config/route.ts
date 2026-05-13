import { NextResponse } from 'next/server';
import {
  loadMcpConfig,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer,
} from '@/lib/storage/mcp-config';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.mcp.config', async () => {
  const configs = await loadMcpConfig();
  return NextResponse.json({ configs });
});

export const POST = withLogging('api.mcp.config', async (request) => {
  const body = (await request.json()) as {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };

  if (!body.name || !body.command) {
    return NextResponse.json({ error: 'name and command are required' }, { status: 400 });
  }

  const config = await addMcpServer({
    name: body.name,
    command: body.command,
    args: body.args ?? [],
    env: body.env,
    enabled: true,
  });

  return NextResponse.json({ config });
});

export const DELETE = withLogging('api.mcp.config', async (request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await removeMcpServer(id);
  return NextResponse.json({ ok: true });
});

export const PATCH = withLogging('api.mcp.config', async (request) => {
  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await toggleMcpServer(id);
  return NextResponse.json({ ok: true });
});
