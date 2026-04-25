'use client';

import { useEffect, useRef } from 'react';
import type { SessionGroup } from '@/types';

export interface ContextMenuProps {
  groups: SessionGroup[];
  onClose: () => void;
  onSelect: (groupId: string | null) => void;
}

export function ContextMenu({ groups, onClose, onSelect }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 left-16 mt-8 w-40 rounded-md border border-border bg-bg shadow-elevation-2 py-1 animate-fade-in"
    >
      <div className="px-2 py-1 text-[11px] text-text-tertiary font-heading font-medium">移动到分组</div>
      <button
        className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover transition-fast cursor-pointer"
        onClick={() => onSelect(null)}
      >
        未分组
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover transition-fast cursor-pointer"
          onClick={() => onSelect(g.id)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}
