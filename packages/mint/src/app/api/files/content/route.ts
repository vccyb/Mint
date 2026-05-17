import { readFile, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { NextResponse } from 'next/server';
import { resolveProjectPath } from '@/lib/path-resolver';
import { withLogging } from '@/lib/with-logging';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const BINARY_EXTENSIONS = new Set([
  '.mp3',
  '.mp4',
  '.wav',
  '.avi',
  '.mov',
  '.mkv',
  '.flac',
  '.zip',
  '.tar',
  '.gz',
  '.rar',
  '.7z',
  '.bz2',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dat',
  '.sqlite',
  '.db',
  '.pyc',
  '.pyo',
  '.class',
  '.jar',
  '.wasm',
]);

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.svg',
]);

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.jsonc': 'json',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'xml',
  '.htm': 'xml',
  '.xml': 'xml',
  '.svg': 'xml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.ini': 'ini',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'dockerfile',
  '.tf': 'hcl',
  '.lua': 'lua',
  '.r': 'r',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.erl': 'erlang',
  '.hs': 'haskell',
  '.scala': 'scala',
  '.vue': 'xml',
  '.svelte': 'xml',
  '.gitignore': 'bash',
  '.env': 'bash',
};

function getLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  // Check exact filename matches first (e.g. Dockerfile, Makefile)
  if (lower === 'dockerfile') return 'dockerfile';
  if (lower === 'makefile') return 'makefile';
  if (lower === '.gitignore' || lower === '.env' || lower.startsWith('.env.')) return 'bash';
  return EXT_TO_LANGUAGE[extname(filename).toLowerCase()] ?? 'plaintext';
}

export const GET = withLogging('api.files.content', async (request) => {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  const projectId = searchParams.get('projectId');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  const cwd = await resolveProjectPath({
    projectId: projectId || undefined,
    fallbackPath: process.env.MINT_CWD || process.cwd(),
  });
  const absolutePath = join(cwd, filePath);

  // Security: ensure the resolved path is within cwd
  const relativePath = relative(cwd, absolutePath);
  if (relativePath.startsWith('..') || relativePath.startsWith('/')) {
    return NextResponse.json({ error: 'Path traversal not allowed' }, { status: 403 });
  }

  const fileStat = await stat(absolutePath);
  if (!fileStat.isFile()) {
    return NextResponse.json({ error: 'Not a file' }, { status: 400 });
  }

  if (fileStat.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large (${Math.round(fileStat.size / 1024)}KB). Maximum size is 1MB.` },
      { status: 413 },
    );
  }

  const ext = extname(absolutePath).toLowerCase();

  // Handle image files — return base64 encoded content
  if (IMAGE_EXTENSIONS.has(ext)) {
    const buffer = await readFile(absolutePath);
    const base64 = buffer.toString('base64');
    const name = filePath.split('/').pop() ?? filePath;
    return NextResponse.json({
      path: filePath,
      name,
      content: base64,
      encoding: 'base64',
      mimeType: IMAGE_MIME[ext] ?? 'application/octet-stream',
      size: fileStat.size,
    });
  }

  if (BINARY_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Binary file preview not supported' }, { status: 415 });
  }

  const content = await readFile(absolutePath, 'utf-8');
  const name = filePath.split('/').pop() ?? filePath;

  return NextResponse.json({
    path: filePath,
    name,
    content,
    language: getLanguage(name),
    size: fileStat.size,
  });
});
