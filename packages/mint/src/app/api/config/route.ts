import { getStorage } from '@/lib/storage';
import { NextResponse } from 'next/server';

export async function GET() {
  const storage = getStorage();
  const config = await storage.readConfig();
  return NextResponse.json(config ?? {});
}

export async function POST(request: Request) {
  const storage = getStorage();
  const body = await request.json();
  const updated = await storage.updateConfig(body);
  return NextResponse.json(updated);
}
