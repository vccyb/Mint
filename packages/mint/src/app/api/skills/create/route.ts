import { createSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const POST = withLogging('api.skills.create', async (request) => {
  const { name, description, content } = (await request.json()) as {
    name: string;
    description: string;
    content: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Skill name is required' }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Skill instructions are required' }, { status: 400 });
  }

  const skill = await createSkill(name.trim(), description?.trim() ?? '', content.trim());
  return NextResponse.json({ skill });
});
