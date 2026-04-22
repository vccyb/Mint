import { exec } from 'child_process';
import { promisify } from 'util';
import { getSkillContent } from '@/lib/storage/skills';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
    const { content: _, level } = await getSkillContent(name);

    // Determine file path based on level
    const os = await import('os');
    const path = await import('path');
    const userDir = path.join(os.homedir(), '.mint', 'skills');
    const builtinDir = path.join(process.cwd(), 'mint-skills');
    const dir = level === 'builtin' ? builtinDir : userDir;
    const filePath = path.join(dir, name, 'SKILL.md');

    // Open with system default editor
    const platform = process.platform;
    let command: string;
    if (platform === 'darwin') {
      command = `open "${filePath}"`;
    } else if (platform === 'win32') {
      command = `start "" "${filePath}"`;
    } else {
      command = `xdg-open "${filePath}"`;
    }

    await execAsync(command);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to open skill';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
