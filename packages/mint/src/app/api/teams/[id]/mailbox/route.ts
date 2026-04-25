import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { routeMessage, getMessages } from '@/lib/mailbox-router';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id: teamId } = await params;
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') ?? undefined;

    const messages = await getMessages(teamId, agentId);
    return NextResponse.json(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get mailbox messages';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id: teamId } = await params;
    const body = await request.json();
    const { fromAgentId, toAgentId, content, type } = body;

    if (!fromAgentId || typeof fromAgentId !== 'string') {
      return NextResponse.json(
        { error: 'fromAgentId is required' },
        { status: 400 },
      );
    }
    if (!toAgentId || typeof toAgentId !== 'string') {
      return NextResponse.json(
        { error: 'toAgentId is required' },
        { status: 400 },
      );
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 },
      );
    }

    const validTypes = ['info', 'question', 'result', 'handoff'];
    const messageType = validTypes.includes(type) ? type : 'info';

    const message = await routeMessage(teamId, {
      fromAgentId,
      toAgentId,
      content,
      type: messageType as 'info' | 'question' | 'result' | 'handoff',
    });

    return NextResponse.json(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send mailbox message';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
