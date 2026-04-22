import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const storage = getStorage();
    await storage.initialize();

    if (body.moveSession) {
      await storage.groups.moveSessionToGroup(body.moveSession, id);
    } else {
      await storage.groups.updateGroup(id, body);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update group';
    return NextResponse.json({ error: message }, { status: 500 });
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
    await storage.groups.deleteGroup(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
