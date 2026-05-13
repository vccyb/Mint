import { getStorage } from '@/lib/storage';
import { DEFAULT_MODEL } from '@/lib/constants';
import { withLogging } from '@/lib/with-logging';

/** GET /api/threads - list all threads, optionally filtered by project */
export const GET = withLogging('api.threads', async (request) => {
  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get('projectId');
  const parsedProjectId = projectId === 'null' ? null : projectId;

  const storage = getStorage();
  await storage.initialize();

  const threads = await storage.threads.list(parsedProjectId);

  return Response.json({ threads });
});

/** POST /api/threads - create a new thread */
export const POST = withLogging('api.threads', async (request) => {
  const body = await request.json();
  const { title, projectId, mode, model } = body as {
    title?: string;
    projectId?: string | null;
    mode?: 'chat' | 'agent';
    model?: string;
  };

  if (!title) {
    return Response.json({ error: 'Thread title is required' }, { status: 400 });
  }

  const storage = getStorage();
  await storage.initialize();

  const thread = await storage.threads.create({
    title,
    type: 'thread',
    projectId: projectId || null,
    mode: mode || 'agent',
    model: model || DEFAULT_MODEL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  });

  return Response.json({ thread });
});
