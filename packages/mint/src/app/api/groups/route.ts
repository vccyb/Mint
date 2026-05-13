import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.groups', async () => {
  const storage = getStorage();
  await storage.initialize();
  const groups = await storage.groups.read();
  return NextResponse.json(groups);
});

export const PATCH = withLogging('api.groups', async (request) => {
  const { sessionId } = await request.json();
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }
  const storage = getStorage();
  await storage.initialize();
  await storage.groups.moveSessionToGroup(sessionId, null);
  return NextResponse.json({ success: true });
});

export const POST = withLogging('api.groups', async (request) => {
  const { name } = await request.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const storage = getStorage();
  await storage.initialize();
  const group = await storage.groups.addGroup(name.trim());
  return NextResponse.json(group);
});
