'use client';

import { useState, useEffect } from 'react';
import type { TeammateState } from '@/types';
import { TeammateCard } from './teammate-card';
import { TeamSummaryBar } from './team-summary-bar';

interface TeamDrawerProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onExpand: (selectedTaskId?: string) => void;
  onClose: () => void;
}

export function TeamDrawer({ teammates, isWaitingResume, onExpand, onClose }: TeamDrawerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const hasRunning = teammates.some((t) => t.status === 'running');
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [teammates]);

  return (
    <>
      {/* Resize handle */}
      <div className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/20 transition-colors" />

      {/* Drawer panel */}
      <div
        className="shrink-0 flex flex-col min-h-0 border-l border-border overflow-hidden"
        style={{ width: '320px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <span className="text-[11px] font-medium text-muted-foreground">团队看板</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onExpand()}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-bg-warm text-text-tertiary hover:text-muted-foreground transition-colors cursor-pointer"
              title="全屏模式"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-5 h-5 rounded hover:bg-bg-warm text-text-tertiary hover:text-muted-foreground transition-colors cursor-pointer"
              title="关闭"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <TeamSummaryBar teammates={teammates} compact />

        {/* Waiting resume banner */}
        {isWaitingResume && (
          <div className="mx-2.5 my-2 px-3 py-2 rounded-lg bg-primary/10 text-[11px] text-primary flex items-center gap-2 shrink-0">
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
            正在收集结果...
          </div>
        )}

        {/* Teammate cards */}
        <div className="flex-1 overflow-y-auto py-1.5">
          {teammates.map((tm) => (
            <TeammateCard
              key={tm.taskId}
              teammate={tm}
              now={now}
              compact
              onClick={() => onExpand(tm.taskId)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
