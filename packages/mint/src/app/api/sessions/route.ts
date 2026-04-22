import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import type { Mode } from '@/types';

export async function GET(request: Request) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list sessions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
