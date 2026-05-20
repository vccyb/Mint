import { promises as fs } from 'fs';
import path from 'path';

const CONTEXT_FILES = ['MINT.md', '.mint/context.md'];

/**
 * Read project context from MINT.md or .mint/context.md in the given directory.
 * Returns the file content or null if not found.
 */
export async function readProjectContext(cwd: string): Promise<string | null> {
  for (const filename of CONTEXT_FILES) {
    const filePath = path.join(cwd, filename);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      if (content.trim()) return content.trim();
    } catch {
      // File doesn't exist, try next
    }
  }
  return null;
}
