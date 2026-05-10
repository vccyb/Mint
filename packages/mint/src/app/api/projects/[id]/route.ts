import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';

/** PATCH /api/projects/[id] - 更新工程 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/projects/[id] - 删除工程 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const storage = getStorage();
    await storage.initialize();

    // 获取工程下的所有会话
    const project = await storage.projects.getProject(id);
    if (project) {
      // 删除工程下的所有会话
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return Response.json({ error: message }, { status: 500 });
  }
}
