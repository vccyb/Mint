'use client';

import { useState, useEffect } from 'react';
import type { TeammateState } from '@/types';
import { avatarColor } from './teammate-shared';

interface InlineTeamStatusProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onViewTeam: () => void;
}

export function InlineTeamStatus({
  teammates,
  isWaitingResume,
  onViewTeam,
}: InlineTeamStatusProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const hasRunning = teammates.some((t) => t.status === 'running');
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [teammates]);

  const runningCount = teammates.filter((t) => t.status === 'running').length;
  const completedCount = teammates.filter((t) => t.status === 'completed').length;
  const failedCount = teammates.filter((t) => t.status === 'failed').length;
  const allDone = runningCount === 0;

  // Status text
  let statusText: string;
  let statusColor: string;
  if (isWaitingResume) {
    statusText = '正在收集结果...';
    statusColor = 'text-primary';
  } else if (runningCount > 0) {
    statusText = `${runningCount} agents 运行中`;
    statusColor = 'text-primary';
  } else if (failedCount > 0) {
    statusText = `${completedCount}/${teammates.length} 已完成`;
    statusColor = 'text-destructive';
  } else {
    statusText = `${teammates.length} agents 已完成`;
    statusColor = 'text-success';
  }

  // Visible avatars (max 5)
  const visibleCount = Math.min(teammates.length, 5);
  const overflow = teammates.length - visibleCount;

  return (
    <div className="px-6 py-2">
      <div className="mx-auto max-w-[640px] flex items-center gap-3 h-[48px] px-4 rounded-xl border border-[rgba(0,0,0,0.06)] bg-bg-warm/80 backdrop-blur-sm">
        {/* Avatar row */}
        <div className="flex items-center -space-x-1.5 shrink-0">
          {teammates.slice(0, visibleCount).map((tm) => {
            const color = avatarColor(tm.index);
            return (
              <div key={tm.taskId} className="relative">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2 ring-white"
                  style={{ backgroundColor: color }}
                >
                  {tm.index + 1}
                </div>
                {tm.status === 'running' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-1 ring-white" />
                )}
                {tm.status === 'completed' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success ring-1 ring-white" />
                )}
              </div>
            );
          })}
          {overflow > 0 && <span className="text-[9px] text-muted-foreground ml-2">+{overflow}</span>}
        </div>

        {/* Status text */}
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${statusColor}`}>
          {(isWaitingResume || runningCount > 0) && (
            <svg className="h-3 w-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="32"
                strokeLinecap="round"
              />
            </svg>
          )}
          <span>{statusText}</span>
        </div>

        {/* View team link */}
        <button
          onClick={onViewTeam}
          className="ml-auto text-[11px] font-medium text-primary hover:text-primary-hover transition-colors shrink-0 cursor-pointer"
        >
          查看团队 →
        </button>
      </div>
    </div>
  );
}
