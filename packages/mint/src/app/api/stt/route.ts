import { getStorage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';
import type { AppConfig } from '@/lib/storage/config';
import { createSession, sendAudioChunk, closeSession } from '@/lib/doubao-asr';

export const POST = withLogging('api.stt', async (request) => {
  const body = await request.json();
  const { action, audio, isLast } = body as {
    action: 'start' | 'chunk';
    sessionId?: string;
    audio?: string; // base64-encoded PCM data
    isLast?: boolean;
  };

  // Resolve STT config
  const config: Partial<AppConfig> = (await getStorage().readConfig()) ?? {};
  const apiKey = config.sttApiKey ?? process.env.STT_API_KEY;
  const resourceId = config.sttResourceId ?? process.env.STT_RESOURCE_ID ?? 'volc.bigasr.sauc.duration';

  if (!apiKey) {
    return NextResponse.json(
      { error: '请先在设置中配置 STT API Key（豆包语音识别密钥）' },
      { status: 500 },
    );
  }

  // ── Start session ──────────────────────────────────────────────────
  if (action === 'start') {
    try {
      const sessionId = await createSession(apiKey, resourceId);
      return NextResponse.json({ sessionId, text: '' });
    } catch (err) {
      return NextResponse.json(
        { error: `连接豆包 ASR 失败: ${(err as Error).message}` },
        { status: 500 },
      );
    }
  }

  // ── Send audio chunk ───────────────────────────────────────────────
  if (action === 'chunk') {
    const { sessionId } = body as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const audioBuffer = audio
      ? Buffer.from(audio, 'base64')
      : Buffer.alloc(0);

    const result = sendAudioChunk(sessionId, audioBuffer, isLast ?? false);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
});

// Clean up stale sessions on DELETE
export const DELETE = withLogging('api.stt', async (request) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (sessionId) {
    closeSession(sessionId);
  }
  return NextResponse.json({ ok: true });
});
