import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const { sessionId, messages } = await request.json();
  if (!sessionId || !messages?.length) {
    return NextResponse.json({ error: 'Missing sessionId or messages' }, { status: 400 });
  }

  const userMsg = messages.find((m: { role: string }) => m.role === 'user');

  if (!userMsg?.content) {
    return NextResponse.json({ title: '' }, { status: 200 });
  }

  // Extract text content, stripping mention tokens
  let content = typeof userMsg.content === 'string' ? userMsg.content : '';
  content = content
    .replace(/@\{[^}]+\}/g, '')
    .replace(/\/\{[^}]+\}/g, '')
    .replace(/#\{[^}]+\}/g, '')
    .trim();

  // Generate title: first ~20 chars with natural break point
  let title = '';
  if (content.length <= 20) {
    title = content;
  } else {
    const truncated = content.slice(0, 25);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastChinese = truncated.search(/[\u4e00-\u9fff]/);
    if (lastChinese >= 0 && lastChinese < 20) {
      title = content.slice(0, Math.min(20, content.length));
    } else if (lastSpace > 5) {
      title = truncated.slice(0, lastSpace);
    } else {
      title = content.slice(0, 20);
    }
  }

  title = title.trim();
  if (!title) title = '新对话';

  // Persist title via storage layer
  try {
    const storage = getStorage();
    await storage.initialize();
    await storage.updateSessionMetadata(sessionId, { title });
  } catch {
    // Non-critical: title update failed
  }

  return NextResponse.json({ title });
}
