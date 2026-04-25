'use client';

import { cn } from '@/lib/utils';

type PermMode = 'bypassPermissions' | 'default' | 'plan';

const MODES: PermMode[] = ['bypassPermissions', 'default', 'plan'];

const MODE_LABELS: Record<PermMode, string> = {
  bypassPermissions: '自动',
  default: '确认',
  plan: '规划',
};

interface PermissionModeSelectorProps {
  mode: PermMode;
  onModeChange: (mode: PermMode) => void;
  onTogglePlanMode?: () => void;
  shortcutLabel?: string;
}

export function PermissionModeSelector({
  mode,
  onModeChange,
}: PermissionModeSelectorProps) {
  return (
    <div className='inline-flex items-center rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F5F5F7] p-[2px]'>
      {MODES.map((m) => {
        const isActive = m === mode;
        return (
          <button
            key={m}
            type='button'
            onClick={() => onModeChange(m)}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] transition-colors cursor-pointer',
              isActive
                ? 'bg-[#E8F2FF] text-[#007AFF] font-medium'
                : 'text-gray-400 hover:text-text-secondary',
            )}
          >
            {MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
