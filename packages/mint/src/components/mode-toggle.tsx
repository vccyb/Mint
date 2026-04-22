'use client';

import { cn } from '@/lib/utils';
import { MessageCircle, Bot } from 'lucide-react';
import type { Mode } from '@/types';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

const modes: { value: Mode; label: string; icon: typeof MessageCircle }[] = [
  { value: 'chat', label: 'Chat', icon: MessageCircle },
  { value: 'agent', label: 'Agent', icon: Bot },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex justify-center px-3 pt-3 pb-2">
      <div className="relative inline-flex rounded border border-border bg-bg p-0.5">
        {/* Sliding indicator */}
        <div
          className={cn(
            'absolute top-0.5 h-[calc(100%-4px)] rounded bg-bg shadow-whisper-sm transition-all duration-200',
            mode === 'chat' ? 'left-0.5 w-[calc(50%-2px)]' : 'left-[calc(50%+1px)] w-[calc(50%-2px)]',
          )}
        />
        {modes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onModeChange(value)}
            className={cn(
              'relative z-10 flex items-center gap-1.5 rounded px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              mode === value ? 'text-text' : 'text-text-tertiary hover:text-text-secondary',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
