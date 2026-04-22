import { toggleSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name } = (await request.json()) as { name: string };
    if (!name) {
      return NextResponse.json({ error: 'Skill name required' }, { status: 400 });
    }
    const enabled = await toggleSkill(name);
    return NextResponse.json({ name, enabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
