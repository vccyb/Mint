import { deleteSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    await deleteSkill(name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
