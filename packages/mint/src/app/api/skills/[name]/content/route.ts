import { getSkillContent, updateSkillContent } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const result = await getSkillContent(name);
    return NextResponse.json({ content: result.content, level: result.level });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get skill content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const { content } = (await request.json()) as { content: string };
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    await updateSkillContent(name, content.trim());
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update skill content';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
