export interface SkillMeta {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  level: 'builtin' | 'user';
}

export interface SkillContent {
  name: string;
  description: string;
  version: string;
  content: string;
  level: 'builtin' | 'user';
}

export function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}
