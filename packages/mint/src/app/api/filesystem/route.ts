import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { NextResponse } from 'next/server';
import { homedir } from 'os';
import { withLogging } from '@/lib/with-logging';

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

const SKIP = new Set([
  'node_modules',
  '.git',
  '.next',
  '.cache',
  '.DS_Store',
  '.Trash',
  'Library',
  'System',
  '.Trash',
  '.DocumentRevisions-V100',
  '.Spotlight-V100',
  '.fseventsd',
  '.TemporaryItems',
  '.vol',
  'Applications',
  'Volumes',
]);

export const GET = withLogging('api.filesystem', async (request) => {
  const { searchParams } = new URL(request.url);
  const dir = searchParams.get('dir') || homedir();

  const expanded = dir.startsWith('~') ? homedir() + dir.slice(1) : dir;
  const resolved = resolve(expanded);
  const s = await stat(resolved);
  if (!s.isDirectory()) {
    return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
  }

  const entries = await readdir(resolved, { withFileTypes: true });
  const dirs: DirEntry[] = entries
    .filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ name: e.name, path: join(resolved, e.name), isDirectory: true }));

  return NextResponse.json({
    currentPath: resolved,
    parentPath: resolved !== '/' ? join(resolved, '..') : null,
    entries: dirs,
  });
});
