import { createSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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

    const skill = await createSkill(
      name.trim(),
      description?.trim() ?? '',
      content.trim(),
    );
    return NextResponse.json({ skill });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
