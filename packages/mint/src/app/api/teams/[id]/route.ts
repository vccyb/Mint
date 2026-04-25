import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { loadTeam, completeTeam } from '@/lib/team-orchestrator';
import { deleteTeam as deleteTeamStorage } from '@/lib/storage/team';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id } = await params;
    const team = await loadTeam(id);

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load team';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id } = await params;
    const body = await request.json();

    // Support completing a team via status update
    if (body.status === 'completed') {
      const team = await completeTeam(id);
      if (!team) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
      }
      return NextResponse.json(team);
    }

    return NextResponse.json({ error: 'Unsupported patch operation' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update team';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const storage = getStorage();
    await storage.initialize();

    const { id } = await params;
    await deleteTeamStorage(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete team';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
