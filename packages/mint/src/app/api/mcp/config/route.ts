import { NextResponse } from 'next/server';
import {
  loadMcpConfig,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer,
} from '@/lib/storage/mcp-config';

export async function GET() {
  try {
    const configs = await loadMcpConfig();
    return NextResponse.json({ configs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load MCP config' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add MCP server' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await removeMcpServer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove MCP server' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id } = (await request.json()) as { id: string };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await toggleMcpServer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle MCP server' },
      { status: 500 },
    );
  }
}
