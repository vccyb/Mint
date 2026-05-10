import { NextRequest } from 'next/server';
import { getStorage } from '@/lib/storage';
import type { ChatMessage } from '@/types';

/** GET /api/threads/[id] - 获取线程详情和消息 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get thread';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** PATCH /api/threads/[id] - 更新线程 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update thread';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/threads/[id] - 删除线程 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const storage = getStorage();
    await storage.initialize();

    await storage.threads.delete(id);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete thread';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST /api/threads/[id]/messages - 添加消息到线程 */
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

    await storage.threads.appendMessage(id, body as ChatMessage);

    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add message';
    return Response.json({ error: message }, { status: 500 });
  }
}
