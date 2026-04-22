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
      'absolute -top-2 right-0 flex items-center gap-0.5 rounded-md border border-border bg-bg shadow-whisper-sm px-1 py-0.5',
      'opacity-0 group-hover:opacity-100 transition-opacity',
    )}>
      <button
        onClick={handleCopy}
        className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text transition-colors"
        aria-label="Copy message"
      >
        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </button>
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text transition-colors"
          aria-label="Edit message"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
