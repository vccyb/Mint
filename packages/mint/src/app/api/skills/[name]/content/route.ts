import { getSkillContent, updateSkillContent } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.skills.content', async (_request, { params }) => {
  const { name } = await params;
  const result = await getSkillContent(name);
  return NextResponse.json({ content: result.content, level: result.level });
});

export const PUT = withLogging('api.skills.content', async (request, { params }) => {
  const { name } = await params;
  const { content } = (await request.json()) as { content: string };
  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  await updateSkillContent(name, content.trim());
  return NextResponse.json({ ok: true });
});
