import type { TodoItem } from '@/types';

/** Parse SDK tool-result format to clean text. */
export function parseToolResult(resultStr: string): string {
  try {
    const parsed = JSON.parse(resultStr);
    if (Array.isArray(parsed)) {
      const texts = parsed
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text);
      if (texts.length > 0) return texts.join('\n');
    }
  } catch {
    /* not JSON, return as-is */
  }
  return resultStr;
}

/** Extract a clean, user-friendly description from Task/Agent tool args. */
export function extractTaskDescription(args: Record<string, unknown>): string {
  const desc = (args.description as string) ?? '';
  const prompt = (args.prompt as string) ?? '';

  if (desc && desc.length <= 120) return desc;

  if (prompt) {
    const firstLine = prompt.split('\n')[0]?.trim() ?? '';
    return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
  }

  return desc || 'Working...';
}

/** Build a lightweight skill index prompt for the system prompt. */
export function buildSkillIndexPrompt(
  skills: { name: string; description: string; filePath: string }[],
): string {
  if (skills.length === 0) return '';

  const lines = skills.map(
    (s) => `- **${s.name}**: ${s.description} → \`${s.filePath}\``,
  );

  return [
    '# Available Skills',
    '',
    'You have access to the following skills. Each skill is a SKILL.md file with detailed instructions.',
    '',
    'When a user request matches a skill, use your **Read** tool to load the file, then follow its instructions.',
    'Only load skills that are relevant to the current request — do NOT preload all skills.',
    '',
    ...lines,
    '',
    'Skill files are located at the paths shown above. Use the Read tool with the exact path to load a skill.',
  ].join('\n');
}

/** Check whether a tool call is a Read of a known SKILL.md file. */
export function isSkillRead(
  toolName: string,
  args: Record<string, unknown>,
  skillPathMap: Map<string, { name: string; description: string }>,
): { name: string; description: string } | null {
  if (toolName !== 'Read' && toolName !== 'file') return null;
  const filePath = (args.file_path ?? args.filePath ?? '') as string;
  if (!filePath) return null;

  const normalized = filePath.replace(/\\/g, '/');
  if (!normalized.endsWith('SKILL.md')) return null;

  for (const [skillPath, info] of skillPathMap) {
    const normalizedSkillPath = skillPath.replace(/\\/g, '/');
    if (
      normalized === normalizedSkillPath ||
      normalized.endsWith('/' + normalizedSkillPath)
    ) {
      return info;
    }
  }

  const match = normalized.match(/\/skills\/([^/]+)\/SKILL\.md$/);
  if (match) {
    const name = match[1];
    const info = skillPathMap.get(name);
    return info
      ? { name: info.name, description: info.description }
      : { name, description: '' };
  }

  return null;
}
