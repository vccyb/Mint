import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';

/** GET /api/threads/[id]/changes - 获取线程的文件变更记录 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const storage = getStorage();
    await storage.initialize();

    const changes = await storage.threads.getFileChanges(id);

    return Response.json({ changes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get file changes';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST /api/threads/[id]/changes - 添加文件变更记录 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add file change';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/threads/[id]/changes - 清空文件变更记录 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const storage = getStorage();
    await storage.initialize();

    await storage.threads.clearFileChanges(id);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear file changes';
    return Response.json({ error: message }, { status: 500 });
  }
}
