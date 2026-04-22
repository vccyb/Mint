import { NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';

export async function GET() {
  try {
    const storage = getStorage();
    await storage.initialize();
    const groups = await storage.groups.read();
    return NextResponse.json(groups);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read groups';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }
    // Move to ungrouped (null)
    const storage = getStorage();
    await storage.initialize();
    await storage.groups.moveSessionToGroup(sessionId, null);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to move session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const storage = getStorage();
    await storage.initialize();
    const group = await storage.groups.addGroup(name.trim());
    return NextResponse.json(group);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create group';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
