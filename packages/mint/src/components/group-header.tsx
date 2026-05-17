'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Trash2, FolderInput } from 'lucide-react';
import type { SessionGroup } from '@/types';

interface GroupHeaderProps {
  group: SessionGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDrop: (sessionId: string) => void;
}

export function GroupHeader({
  group,
  isCollapsed,
  onToggle,
  onRename,
  onDelete,
  onDrop,
}: GroupHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(group.name);
  }, [group.name]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== group.name) onRename(trimmed);
    else setDraft(group.name);
  };

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') {
              setDraft(group.name);
              setEditing(false);
            }
          }}
          className="bg-transparent border-b border-primary outline-none text-[11px] text-text-secondary w-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider cursor-pointer hover:bg-bg-hover rounded-[4px] ${
        dragOver ? 'bg-primary-light/50' : ''
      }`}
      onClick={onToggle}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const sessionId = e.dataTransfer.getData('text/plain');
        if (sessionId) onDrop(sessionId);
      }}
    >
      <ChevronRight
        className={`h-2.5 w-2.5 shrink-0 transition-transform duration-150 ${
          isCollapsed ? '' : 'rotate-90'
        }`}
      />
      <span className="flex-1 truncate">{group.name}</span>
      <span className="text-[10px] opacity-60 normal-case">{group.sessionIds.length}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="text-text-tertiary hover:text-primary"
          aria-label="Rename group"
        >
          <FolderInput className="h-2.5 w-2.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-text-tertiary hover:text-red-500"
          aria-label="Delete group"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
