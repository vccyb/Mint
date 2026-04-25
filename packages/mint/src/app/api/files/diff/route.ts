import { exec } from 'child_process';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

const execOptions = () => ({
  cwd: process.env.MINT_CWD || process.cwd(),
  maxBuffer: 1024 * 1024,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 },
    );
  }

  try {
    // Get unstaged diff
    const { stdout } = await execAsync(
      `git diff -- ${JSON.stringify(filePath)}`,
      execOptions(),
    );
    // Get staged diff
    const { stdout: stagedStdout } = await execAsync(
      `git diff --cached -- ${JSON.stringify(filePath)}`,
      execOptions(),
    );

    const combinedDiff = stdout + (stagedStdout ? '\n' + stagedStdout : '');

    if (combinedDiff.trim()) {
      return new NextResponse(combinedDiff, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Fallback: diff against HEAD (catches committed changes)
    try {
      const { stdout: headDiff } = await execAsync(
        `git diff HEAD -- ${JSON.stringify(filePath)}`,
        execOptions(),
      );
      if (headDiff.trim()) {
        return new NextResponse(headDiff, {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    } catch { /* not a git repo or no HEAD */ }

    // Last fallback: file might be untracked — show full content as "added"
    try {
      const { stdout: content } = await execAsync(
        `cat -- ${JSON.stringify(filePath)}`,
        execOptions(),
      );
      const lines = content.split('\n');
      const addedLines = lines.map((l: string) => `+${l}`).join('\n');
      const diff = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${addedLines}`;
      return new NextResponse(diff, {
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch {
      return new NextResponse('', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to get diff' },
      { status: 500 },
    );
  }
}
