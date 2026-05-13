import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';
import type { ChatMessage } from '@/types';

/** GET /api/threads/[id] - get thread details and messages */
export const GET = withLogging('api.threads.detail', async (_request, { params }) => {
  const { id } = await params;

  const storage = getStorage();
  await storage.initialize();

  const thread = await storage.threads.get(id);
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  const messages = await storage.threads.readMessages(id);
  const fileChanges = await storage.threads.getFileChanges(id);

  return Response.json({ thread, messages, fileChanges });
});

/** PATCH /api/threads/[id] - update thread */
export const PATCH = withLogging('api.threads.detail', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  const storage = getStorage();
  await storage.initialize();

  await storage.threads.update(id, body);

  const thread = await storage.threads.get(id);
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  return Response.json({ thread });
});

/** DELETE /api/threads/[id] - delete thread */
export const DELETE = withLogging('api.threads.detail', async (_request, { params }) => {
  const { id } = await params;

  const storage = getStorage();
  await storage.initialize();

  await storage.threads.delete(id);

  return Response.json({ success: true });
});

/** POST /api/threads/[id]/messages - append message to thread */
export const POST = withLogging('api.threads.detail', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  const storage = getStorage();
  await storage.initialize();

  const thread = await storage.threads.get(id);
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  await storage.threads.appendMessage(id, body as ChatMessage);

  return Response.json({ success: true });
});
