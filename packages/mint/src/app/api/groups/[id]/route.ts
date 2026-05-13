import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

export const PATCH = withLogging('api.groups.detail', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();
  const storage = getStorage();
  await storage.initialize();

  if (body.moveSession) {
    await storage.groups.moveSessionToGroup(body.moveSession, id);
  } else {
    await storage.groups.updateGroup(id, body);
  }
  return NextResponse.json({ success: true });
});

export const DELETE = withLogging('api.groups.detail', async (_request, { params }) => {
  const { id } = await params;
  const storage = getStorage();
  await storage.initialize();
  await storage.groups.deleteGroup(id);
  return NextResponse.json({ success: true });
});
