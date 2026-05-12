'use client';

import { useState, useEffect } from 'react';
import type { TeammateState } from '@/types';
import { TeammateCard } from './teammate-card';
import { TeamSummaryBar } from './team-summary-bar';
import { TeammateDetail } from './teammate-detail';

interface TeamDetailOverlayProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onClose: () => void;
  initialSelectedId?: string | null;
}

export function TeamDetailOverlay({ teammates, isWaitingResume, onClose, initialSelectedId }: TeamDetailOverlayProps) {
  const [selectedTeammateId, setSelectedTeammateId] = useState<string | null>(initialSelectedId ?? null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const hasRunning = teammates.some((t) => t.status === 'running');
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [teammates]);

  const selectedTeammate = teammates.find((t) => t.taskId === selectedTeammateId);

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-[#1D1D1F]">Agent 团队</span>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-[#F5F5F7] text-[#6E6E73] transition-colors cursor-pointer"
          title="关闭"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body: two columns */}
      <div className="flex flex-1 min-h-0">
        {/* Left: teammate list */}
        <div className="w-[240px] shrink-0 border-r border-border overflow-y-auto">
          <TeamSummaryBar teammates={teammates} />

          {isWaitingResume && (
            <div className="mx-2.5 my-2 px-3 py-2 rounded-lg bg-[#007AFF]/10 text-[11px] text-[#007AFF] flex items-center gap-2 shrink-0">
              <svg className="h-3 w-3 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              正在收集结果...
            </div>
          )}

          <div className="py-1.5">
            {teammates.map((tm) => (
              <TeammateCard
                key={tm.taskId}
                teammate={tm}
                now={now}
                selected={selectedTeammateId === tm.taskId}
                onClick={() => setSelectedTeammateId(tm.taskId)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedTeammate ? (
            <TeammateDetail teammate={selectedTeammate} now={now} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#AEAEB2] gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span className="text-[11px]">点击左侧 Agent 查看详情</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
