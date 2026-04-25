'use client';

import type { TeamStatus } from '@/types';

interface TeamHeaderProps {
  name: string;
  description: string;
  status: TeamStatus;
}

const STATUS_MAP: Record<TeamStatus, { label: string; className: string }> = {
  forming: { label: '组建中', className: 'bg-[#FF9500]/15 text-[#FF9500]' },
  active: { label: '运行中', className: 'bg-[#007AFF]/15 text-[#007AFF]' },
  completed: { label: '已完成', className: 'bg-[#34C759]/15 text-[#34C759]' },
  error: { label: '错误', className: 'bg-[#FF3B30]/15 text-[#FF3B30]' },
};

export function TeamHeader({ name, description, status }: TeamHeaderProps) {
  const badge = STATUS_MAP[status];

  return (
    <div className="px-3 py-2.5 border-b border-border bg-white shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#1D1D1F] truncate">
          {name}
        </span>
        <span
          className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      {description && (
        <p className="text-[11px] text-[#6E6E73] mt-0.5 truncate">
          {description}
        </p>
      )}
    </div>
  );
}
