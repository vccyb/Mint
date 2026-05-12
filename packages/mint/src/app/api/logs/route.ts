import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs, getLogStats } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path');

  // /api/logs?path=stats — return stats
  if (path === 'stats') {
    return NextResponse.json(getLogStats());
  }

  // /api/logs — return log entries
  const sessionId = searchParams.get('sessionId') ?? undefined;
  const scope = searchParams.get('scope') ?? undefined;
  const level = searchParams.get('level') as 'debug' | 'info' | 'warn' | 'error' | undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);
  const offset = Number(searchParams.get('offset') ?? 0);

  const result = getRecentLogs({ sessionId, scope, level, limit, offset });
  return NextResponse.json(result);
}
