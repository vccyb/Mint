import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

/** GET /api/threads/[id]/changes - get file changes for thread */
export const GET = withLogging('api.threads.changes', async (_request, { params }) => {
  const { id } = await params;

  const storage = getStorage();
  await storage.initialize();

  const changes = await storage.threads.getFileChanges(id);

  return Response.json({ changes });
});

/** POST /api/threads/[id]/changes - add file change record */
export const POST = withLogging('api.threads.changes', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  const storage = getStorage();
  await storage.initialize();

  const thread = await storage.threads.get(id);
  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 });
  }

  const change = await storage.threads.addFileChange({
    threadId: id,
    filePath: body.filePath,
    changeType: body.changeType,
    additions: body.additions || 0,
    deletions: body.deletions || 0,
    timestamp: Date.now(),
  });

  return Response.json({ change });
});

/** DELETE /api/threads/[id]/changes - clear file changes */
export const DELETE = withLogging('api.threads.changes', async (_request, { params }) => {
  const { id } = await params;

  const storage = getStorage();
  await storage.initialize();

  await storage.threads.clearFileChanges(id);

  return Response.json({ success: true });
});
