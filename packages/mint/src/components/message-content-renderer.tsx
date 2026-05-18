'use client';

import { Zap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/file-icons';

/** Mint sparkle SVG avatar icon */
export function MintAvatar() {
  return (
    <div className="w-6 h-6 rounded-md bg-bg-warm text-muted-foreground flex items-center justify-center shrink-0">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m12 3-1.9 5.7a2 2 0 0 1-1.3 1.3L3 12l5.7 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.7a2 2 0 0 1 1.3-1.3L21 12l-5.7-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    </div>
  );
}

/** Parse mentions and render as inline styled references (Codex-style) */
export function renderUserContent(content: string, onFileClick?: (path: string) => void) {
  const parts = content.split(/(@\{[^}]+\}|\/\{[^}]+\}|#\{[^}]+\})/g);
  return parts.map((part, i) => {
    const fileMatch = part.match(/^@\{(.+)\}$/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const fileName = filePath.split('/').pop() ?? filePath;
      const { Icon, color } = getFileIcon(fileName);
      return (
        <span
          key={i}
          role={onFileClick ? 'button' : undefined}
          tabIndex={onFileClick ? 0 : undefined}
          title={filePath}
          onClick={onFileClick ? () => onFileClick(filePath) : undefined}
          onKeyDown={onFileClick ? (e) => e.key === 'Enter' && onFileClick(filePath) : undefined}
          className="inline-flex items-center gap-1 px-0.5 text-[12px] font-mono text-primary hover:underline cursor-pointer align-middle"
        >
          <Icon className={cn('h-3 w-3 shrink-0', color)} />
          {fileName}
        </span>
      );
    }
    const skillMatch = part.match(/^\/\{(.+)\}$/);
    if (skillMatch) {
      return (
        <span
          key={i}
          title={`/${skillMatch[1]}`}
          className="inline-flex items-center gap-0.5 px-0.5 text-[12px] font-mono text-[#AF52DE] align-middle"
        >
          <Zap className="h-3 w-3" />
          {skillMatch[1]}
        </span>
      );
    }
    const mcpMatch = part.match(/^#\{(.+)\}$/);
    if (mcpMatch) {
      return (
        <span
          key={i}
          title={`#${mcpMatch[1]}`}
          className="inline-flex items-center gap-0.5 px-0.5 text-[12px] font-mono text-[#34C759] align-middle"
        >
          <Wrench className="h-3 w-3" />
          {mcpMatch[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
