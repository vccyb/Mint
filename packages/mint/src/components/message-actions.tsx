'use client';

import { useState, useCallback } from 'react';
import { Copy, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  content: string;
  isUser: boolean;
  onEdit?: () => void;
}

export function MessageActions({ content, isUser, onEdit }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  return (
    <div className={cn(
      'flex items-center gap-1 mt-1',
      isUser ? 'justify-end' : 'justify-start',
    )}>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-tertiary hover:bg-bg-warm hover:text-text transition-colors cursor-pointer"
        aria-label="Copy message"
      >
        {copied ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3" />}
      </button>
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-tertiary hover:bg-bg-warm hover:text-text transition-colors cursor-pointer"
          aria-label="Edit message"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
