'use client';

import { cn } from '@/lib/utils';
import type { Mode } from '@/types';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

const modes: { value: Mode; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'agent', label: 'Agent' },
];

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex justify-center px-3 pt-3 pb-2">
      <div className="inline-flex overflow-hidden rounded-[10px] border border-border bg-bg">
        {modes.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onModeChange(value)}
            className={cn(
              'px-3.5 py-1 text-[11px] font-medium transition-all duration-200 cursor-pointer',
              mode === value
                ? 'rounded-[9px] bg-primary-light text-primary shadow-sm'
                : 'text-text-tertiary hover:text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
