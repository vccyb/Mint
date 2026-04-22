import { readdir, stat, readFile } from 'fs/promises';
import { join, relative, basename } from 'path';
import { NextResponse } from 'next/server';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

// Common directories/files to skip
const IGNORE = new Set([
  'node_modules',
  '.git',
  '.next',
  '.DS_Store',
  'dist',
  '.turbo',
  '__pycache__',
  '.cache',
  '.data',
]);

const MAX_DEPTH = 3;

async function readTree(dir: string, root: string, depth: number): Promise<FileNode[]> {
  if (depth > MAX_DEPTH) return [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  // Sort: directories first, then files; alphabetical within each group
  const sorted = entries
    .filter((e) => !IGNORE.has(e.name) && !e.name.startsWith('.'))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of sorted) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath) || entry.name;

    if (entry.isDirectory()) {
      const children = await readTree(fullPath, root, depth + 1);
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
    } else {
      nodes.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  return nodes;
}

export async function GET() {
  const cwd = process.env.MINT_CWD || process.cwd();

  try {
    // Check if cwd is accessible
    const s = await stat(cwd);
    if (!s.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    const tree = await readTree(cwd, cwd, 0);

    // Also try to read a project name from package.json
    let projectName = basename(cwd);
    try {
      const pkg = await readFile(join(cwd, 'package.json'), 'utf-8');
      const json = JSON.parse(pkg);
      if (json.name) projectName = json.name;
    } catch {
      // no package.json, use dirname
    }

    return NextResponse.json({ root: cwd, projectName, tree });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read directory' },
      { status: 500 },
    );
  }
}
