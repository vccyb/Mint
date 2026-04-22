export type MentionType = 'file' | 'skill' | 'mcp';

export interface MentionChip {
  type: MentionType;
  label: string;
  value: string;
  description?: string;
}

// Regex patterns to detect triggers in text before cursor
export const MENTION_TRIGGERS: Record<MentionType, RegExp> = {
  file: /@(\S*)$/,
  skill: /(?:^|\s)\/(\S*)$/,
  mcp: /#(\S*)$/,
};

// Inline token format: @{path} /{skill} #{tool}
export const MENTION_TOKEN: Record<MentionType, (value: string) => string> = {
  file: (v) => `@{${v}}`,
  skill: (v) => `/{${v}}`,
  mcp: (v) => `#{${v}}`,
};

// Extract all mention tokens from content
export function extractMentions(content: string): MentionChip[] {
  const mentions: MentionChip[] = [];
  const regex = /(@\{([^}]+)\}|\/\{([^}]+)\}|#\{([^}]+)\})/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[2]) {
      mentions.push({ type: 'file', label: match[2].split('/').pop() ?? match[2], value: match[2] });
    } else if (match[3]) {
      mentions.push({ type: 'skill', label: match[3], value: match[3] });
    } else if (match[4]) {
      mentions.push({ type: 'mcp', label: match[4], value: match[4] });
    }
  }
  return mentions;
}

// Color classes per type
export const MENTION_COLORS: Record<MentionType, { bg: string; border: string; text: string }> = {
  file: { bg: 'bg-primary/5', border: 'border-primary/30', text: 'text-primary' },
  skill: { bg: 'bg-purple-50', border: 'border-purple-300/50', text: 'text-purple-700' },
  mcp: { bg: 'bg-green-50', border: 'border-green-300/50', text: 'text-green-700' },
};
