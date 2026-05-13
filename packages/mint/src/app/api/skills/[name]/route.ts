import { deleteSkill } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const DELETE = withLogging('api.skills.detail', async (_request, { params }) => {
  const { name } = await params;
  await deleteSkill(name);
  return NextResponse.json({ ok: true });
});
