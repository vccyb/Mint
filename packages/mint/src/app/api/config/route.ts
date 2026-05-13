import { getStorage } from '@/lib/storage';
import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';

export const GET = withLogging('api.config', async () => {
  const storage = getStorage();
  const config = await storage.readConfig();
  return NextResponse.json(config ?? {});
});

export const POST = withLogging('api.config', async (request) => {
  const storage = getStorage();
  const body = await request.json();
  const updated = await storage.updateConfig(body);
  return NextResponse.json(updated);
});
