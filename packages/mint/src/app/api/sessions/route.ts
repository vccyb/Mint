import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { DEFAULT_MODEL } from '@/lib/constants';
import { withLogging } from '@/lib/with-logging';
import type { Mode } from '@/types';

export const GET = withLogging('api.sessions', async (request) => {
  const storage = getStorage();
  await storage.initialize();
  let sessions = await storage.listSessions();

  // Filter by mode if specified
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') as Mode | null;
  if (mode) {
    sessions = sessions.filter((s) => s.mode === mode);
  }

  return NextResponse.json(sessions);
});

export const POST = withLogging('api.sessions', async (request) => {
  const body = await request.json();
  const { mode = 'chat', projectId, title } = body as {
    mode?: Mode;
    projectId?: string;
    title?: string;
  };

  const storage = getStorage();
  await storage.initialize();

  // 创建会话
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const sessionMetadata = {
    id: sessionId,
    title: title ?? '新对话',
    mode,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
    model: DEFAULT_MODEL,
    ...(projectId && { projectId }),
  };

  await storage.createSession(sessionMetadata);

  // 如果指定了工程，将会话添加到工程中
  if (projectId) {
    await storage.projects.moveSessionToProject(sessionId, projectId);
  }

  return NextResponse.json(sessionMetadata);
});
