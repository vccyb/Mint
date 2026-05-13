import { listSkills } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.skills', async () => {
  const skills = await listSkills();
  return NextResponse.json({ skills });
});
