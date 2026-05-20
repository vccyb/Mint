
import { useState, useEffect } from 'react';
import type { TeammateState } from '@/types';
import { TeammateCard } from './teammate-card';
import { TeamSummaryBar } from './team-summary-bar';

interface TeamPanelProps {
  teammates?: TeammateState[];
  isWaitingResume?: boolean;
}

export function TeamPanel({ teammates, isWaitingResume }: TeamPanelProps) {
  const [now, setNow] = useState(Date.now());
  const hasTeammates = teammates && teammates.length > 0;

  useEffect(() => {
    if (!hasTeammates) return;
    const hasRunning = teammates.some((t) => t.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasTeammates, teammates?.some((t) => t.status === 'running')]);

  if (!hasTeammates) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-tertiary gap-3 p-6">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 17v5" />
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <div className="text-center">
          <div className="text-[11px] font-medium text-muted-foreground mb-1">Agent 团队</div>
          <div className="text-[10px] text-text-tertiary leading-relaxed">
            创建团队任务以查看
            <br />
            多代理协作进度
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <TeamSummaryBar teammates={teammates} compact />

      {isWaitingResume && (
        <div className="mx-2.5 my-2 px-3 py-2 rounded-lg bg-primary/10 text-[11px] text-primary flex items-center gap-2 shrink-0">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
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

      <div className="py-1.5">
        {teammates.map((tm) => (
          <TeammateCard key={tm.taskId} teammate={tm} now={now} compact />
        ))}
      </div>
    </div>
  );
}
