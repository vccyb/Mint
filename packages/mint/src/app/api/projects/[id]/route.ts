import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

/** PATCH /api/projects/[id] - update project */
export const PATCH = withLogging('api.projects.detail', async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  const storage = getStorage();
  await storage.initialize();

  await storage.projects.updateProject(id, body);

  const project = await storage.projects.getProject(id);
  if (!project) {
    return Response.json({ error: 'Project not found' }, { status: 404 });
  }

  return Response.json({ project });
});

/** DELETE /api/projects/[id] - delete project */
export const DELETE = withLogging('api.projects.detail', async (_request, { params }) => {
  const { id } = await params;

  const storage = getStorage();
  await storage.initialize();

  // get all sessions under the project
  const project = await storage.projects.getProject(id);
  if (project) {
    // delete all sessions under the project
    for (const sessionId of project.sessionIds) {
      try {
        await storage.deleteSession(sessionId);
      } catch {
        // ignore if session already deleted
      }
    }
  }

  await storage.projects.deleteProject(id);

  return Response.json({ success: true });
});
