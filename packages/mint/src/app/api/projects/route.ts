import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';

/** GET /api/projects - 列出所有工程 */
export async function GET() {
  try {
    const storage = getStorage();
    await storage.initialize();
    const projects = await storage.projects.list();
    return Response.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list projects';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST /api/projects - 创建新工程 */
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project';
    return Response.json({ error: message }, { status: 500 });
  }
}
