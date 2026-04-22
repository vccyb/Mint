import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const storage = getStorage();
    await storage.initialize();
    const session = await storage.readSession(id);
    return NextResponse.json(session);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Session not found';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storage = getStorage();
    await storage.initialize();
    await storage.deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const storage = getStorage();
    await storage.initialize();
    await storage.updateSessionMetadata(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
