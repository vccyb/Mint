import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.sessions.detail', async (_request, { params }) => {
  const { id } = await params;
  const storage = getStorage();
  await storage.initialize();
  const session = await storage.readSession(id);
  return NextResponse.json(session);
});

export const DELETE = withLogging('api.sessions.detail', async (_request, { params }) => {
  const { id } = await params;
  const storage = getStorage();
  await storage.initialize();
  await storage.deleteSession(id);
  return NextResponse.json({ success: true });
});

export const PATCH = withLogging('api.sessions.detail', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const storage = getStorage();
  await storage.initialize();
  await storage.updateSessionMetadata(id, body);
  return NextResponse.json({ success: true });
});

export const POST = withLogging('api.sessions.detail', async (request, { params }) => {
  const { id } = await params;
  const { action, messageId } = await request.json();
  const storage = getStorage();
  await storage.initialize();

  if (action === 'fork' && messageId) {
    const keptCount = await storage.truncateAfterMessage(id, messageId);
    const session = await storage.readSession(id);
    return NextResponse.json({ success: true, messages: session.messages, messageCount: keptCount });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});
