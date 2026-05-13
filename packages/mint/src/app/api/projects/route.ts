import { getStorage } from '@/lib/storage';
import { withLogging } from '@/lib/with-logging';

/** GET /api/projects - list all projects */
export const GET = withLogging('api.projects', async () => {
  const storage = getStorage();
  await storage.initialize();
  const projects = await storage.projects.list();
  return Response.json({ projects });
});

/** POST /api/projects - create a new project */
export const POST = withLogging('api.projects', async (request) => {
  const body = await request.json();
  const { name, projectPath } = body as { name?: string; projectPath?: string };

  if (!name) {
    return Response.json({ error: 'Project name is required' }, { status: 400 });
  }

  const storage = getStorage();
  await storage.initialize();

  const project = await storage.projects.addProject(
    name,
    projectPath || process.env.MINT_CWD || process.cwd(),
  );

  return Response.json({ project });
});
