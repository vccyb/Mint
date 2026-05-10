import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';

/** GET /api/threads - 列出所有线程，可选按工程筛选 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const parsedProjectId = projectId === 'null' ? null : projectId;

    const storage = getStorage();
    await storage.initialize();

    const threads = await storage.threads.list(parsedProjectId);

    return Response.json({ threads });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list threads';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST /api/threads - 创建新线程 */
export async function POST(request: NextRequest) {
  try {
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
      model: model || 'glm-5.1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    });

    return Response.json({ thread });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create thread';
    return Response.json({ error: message }, { status: 500 });
  }
}
