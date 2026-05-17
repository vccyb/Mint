import { NextRequest, NextResponse } from 'next/server';
import { getRecentLogs, getLogStats, type LogEntry } from '@/lib/logger';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get('path');

  // /api/logs?path=stats — return stats
  if (path === 'stats') {
    return NextResponse.json(getLogStats());
  }

  // /api/logs?format=export — download logs as JSONL
  const format = searchParams.get('format');
  if (format === 'export') {
    const sessionId = searchParams.get('sessionId') ?? undefined;
    const scope = searchParams.get('scope') ?? undefined;
    const level = searchParams.get('level') as 'debug' | 'info' | 'warn' | 'error' | undefined;
    const result = getRecentLogs({ sessionId, scope, level, limit: 5000, offset: 0 });
    const lines = result.entries.map((e) => JSON.stringify(e)).join('\n');
    return new Response(lines, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="mint-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jsonl"`,
      },
    });
  }

  // /api/logs?history=YYYY-MM-DD — load historical logs from disk
  const history = searchParams.get('history');
  if (history) {
    try {
      const logDir = join(homedir(), '.mint', 'logs');
      const filePath = join(logDir, `mint-${history}.log`);
      const content = await readFile(filePath, 'utf-8');
      const entries = content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line, i) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as LogEntry[];
      return NextResponse.json({ entries, total: entries.length });
    } catch {
      return NextResponse.json({ entries: [], total: 0 });
    }
  }

  // /api/logs — return log entries (default)
  const sessionId = searchParams.get('sessionId') ?? undefined;
  const scope = searchParams.get('scope') ?? undefined;
  const level = searchParams.get('level') as 'debug' | 'info' | 'warn' | 'error' | undefined;
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);
  const offset = Number(searchParams.get('offset') ?? 0);

  const result = getRecentLogs({ sessionId, scope, level, limit, offset });
  return NextResponse.json(result);
}
