'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';
import type { Attachment } from '@/types';

interface AttachmentChipsProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentChips({ attachments, onRemove }: AttachmentChipsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5 px-3 pt-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-warm px-2 py-1 text-xs text-text-secondary hover:border-primary/20 hover:bg-primary/[0.03] transition-colors duration-150"
        >
          {att.type.startsWith('image/') ? (
            <ImageIcon className="h-3 w-3" />
          ) : (
            <FileText className="h-3 w-3" />
          )}
          <span className="max-w-[150px] truncate">{att.name}</span>
          <button
            onClick={() => onRemove(att.id)}
            className="ml-0.5 text-text-tertiary hover:text-text cursor-pointer"
            aria-label={`Remove ${att.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
