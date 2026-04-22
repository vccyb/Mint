import { readdir, stat } from 'fs/promises';
import { join, relative, extname } from 'path';
import { NextRequest, NextResponse } from 'next/server';

const IGNORE = new Set([
  'node_modules', '.git', '.next', '.DS_Store', 'dist', '.turbo',
  '__pycache__', '.cache', '.data', '.claude',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.mp3', '.mp4', '.wav', '.zip', '.tar', '.gz', '.rar', '.7z',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.sqlite', '.db', '.pyc', '.class', '.jar', '.wasm',
]);

const MAX_RESULTS = 20;
const MAX_DEPTH = 5;

interface FileSearchResult {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

async function searchFiles(
  dir: string,
  root: string,
  query: string,
  depth: number,
  results: FileSearchResult[],
): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  const lowerQuery = (query === '*' || !query) ? '' : query.toLowerCase();

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) break;
    if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;

    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath) || entry.name;

    if (entry.isDirectory()) {
      if (lowerQuery === '' || entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({ name: entry.name, path: relPath, type: 'directory' });
      }
      await searchFiles(fullPath, root, query, depth + 1, results);
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      if (lowerQuery === '' || entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({ name: entry.name, path: relPath, type: 'file' });
      } else if (relPath.toLowerCase().includes(lowerQuery)) {
        results.push({ name: entry.name, path: relPath, type: 'file' });
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const cwd = process.env.MINT_CWD || process.cwd();

  try {
    const s = await stat(cwd);
    if (!s.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const results: FileSearchResult[] = [];
    await searchFiles(cwd, cwd, query, 0, results);

    return NextResponse.json({ results: results.slice(0, MAX_RESULTS) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 },
    );
  }
}
