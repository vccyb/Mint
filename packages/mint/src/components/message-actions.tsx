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
      'absolute -top-3 right-0 flex items-center gap-0.5',
      'rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-1 py-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
      'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
    )}>
      <button
        onClick={handleCopy}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[#AEAEB2] hover:bg-[#EDEDF0] hover:text-[#1D1D1F] transition-all duration-150 cursor-pointer"
        aria-label="Copy message"
      >
        {copied ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3" />}
      </button>
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#AEAEB2] hover:bg-[#EDEDF0] hover:text-[#1D1D1F] transition-all duration-150 cursor-pointer"
          aria-label="Edit message"
        >
          <Pencil className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
