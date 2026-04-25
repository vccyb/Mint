import { NextResponse } from 'next/server';
import { createTeam, loadTeamsBySession } from '@/lib/team-orchestrator';
import { getStorage } from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 },
      );
    }

    const teams = await loadTeamsBySession(sessionId);
    return NextResponse.json(teams);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list teams';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const body = await request.json();
    const { sessionId, prompt } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 },
      );
    }
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 },
      );
    }

    const team = await createTeam(sessionId, prompt);
    return NextResponse.json(team);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create team';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
