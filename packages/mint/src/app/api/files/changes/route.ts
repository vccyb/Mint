import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

const execOptions = () => ({
  cwd: process.env.MINT_CWD || process.cwd(),
  maxBuffer: 1024 * 1024,
});

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'renamed';
}

function parseGitStatus(raw: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const statusCode = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    if (!filePath) continue;

    // Handle renamed files: "R  old -> new"
    const renamedMatch = filePath.match(/^(.+)\s->\s(.+)$/);
    const actualPath = renamedMatch ? renamedMatch[2] : filePath;

    const code = statusCode.trim();
    let status: ChangedFile['status'];
    if (code === 'A' || code === '??') status = 'added';
    else if (code === 'D') status = 'deleted';
    else if (code.startsWith('R')) status = 'renamed';
    else status = 'modified';

    files.push({ path: actualPath, status });
  }
  return files;
}

export async function GET() {
  try {
    // Get tracked changes (staged + unstaged)
    const { stdout: statusOut } = await execAsync(
      'git status --porcelain --no-renames',
      execOptions(),
    );

    // Get untracked files as well (already included with --porcelain)
    const files = parseGitStatus(statusOut);

    return NextResponse.json({ files });
  } catch (err) {
    // Not a git repo or git not available
    return NextResponse.json({ files: [] });
  }
}
