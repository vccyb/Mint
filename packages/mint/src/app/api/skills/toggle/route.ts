import { toggleSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const POST = withLogging('api.skills.toggle', async (request) => {
  const { name } = (await request.json()) as { name: string };
  if (!name) {
    return NextResponse.json({ error: 'Skill name required' }, { status: 400 });
  }
  const enabled = await toggleSkill(name);
  return NextResponse.json({ name, enabled });
});
