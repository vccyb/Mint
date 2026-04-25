import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { spawnAgent } from '@/lib/agent-spawner';
import { loadTeam } from '@/lib/team-orchestrator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id: teamId } = await params;
    const body = await request.json();
    const { agentId } = body;

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 },
      );
    }

    const team = await loadTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const agent = team.agents.find((a) => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found in team' }, { status: 404 });
    }

    const spawned = await spawnAgent(teamId, agent);
    return NextResponse.json(spawned);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to spawn agent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
