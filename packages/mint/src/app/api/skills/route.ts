import { listSkills } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

export async function GET() {
  const skills = await listSkills();
  return NextResponse.json({ skills });
}
