import { NextResponse } from 'next/server';
import { listSkills } from '@/lib/storage/skills';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const normalizedQuery = q === '*' ? '' : q.toLowerCase();

    const allSkills = await listSkills();
    const results = allSkills
      .filter((s) => {
        if (!normalizedQuery) return true;
        return (
          s.name.toLowerCase().includes(normalizedQuery) ||
          s.description.toLowerCase().includes(normalizedQuery)
        );
      })
      .map((s) => ({
        type: 'skill' as const,
        label: s.name,
        value: s.name,
        description: s.description,
      }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search skills' },
      { status: 500 },
    );
  }
}
