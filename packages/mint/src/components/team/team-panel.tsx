'use client';

import { useState, useEffect } from 'react';
import type { TeammateState } from '@/types';
import { avatarColor, formatElapsed, STATUS_BG, STATUS_COLORS, STATUS_LABEL } from './teammate-shared';
import { TeammateDetail } from './teammate-detail';

interface TeamPanelProps {
  fullscreen?: boolean;
  teammates?: TeammateState[];
  isWaitingResume?: boolean;
}

export function TeamPanel({ fullscreen = false, teammates, isWaitingResume }: TeamPanelProps) {
  const [selectedTeammateId, setSelectedTeammateId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const hasTeammates = teammates && teammates.length > 0;

  // Tick every second for live elapsed timers
  useEffect(() => {
    if (!hasTeammates) return;
    const hasRunning = teammates.some((t) => t.status === 'running');
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasTeammates, teammates?.some((t) => t.status === 'running')]);

  if (!hasTeammates) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#AEAEB2] gap-3 p-6">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 17v5" />
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <div className="text-center">
          <div className="text-[11px] font-medium text-[#6E6E73] mb-1">Agent 团队</div>
          <div className="text-[10px] text-[#AEAEB2] leading-relaxed">
            创建团队任务以查看<br />多代理协作进度
          </div>
        </div>
      </div>
    );
  }

  const completedCount = teammates.filter((t) => t.status === 'completed').length;
  const runningCount = teammates.filter((t) => t.status === 'running').length;
  const failedCount = teammates.filter((t) => t.status === 'failed').length;
  const totalCount = teammates.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const selectedTeammate = teammates.find((t) => t.taskId === selectedTeammateId);

  // Fullscreen layout: two columns
  if (fullscreen) {
    return (
      <div className="flex flex-1 min-h-0">
        {/* Left: Teammate list */}
        <div className="w-[240px] shrink-0 border-r border-border overflow-y-auto">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1D1D1F]">Agent 团队</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                runningCount > 0 ? 'bg-[#007AFF]/15 text-[#007AFF]'
                  : failedCount > 0 ? 'bg-[#FF3B30]/15 text-[#FF3B30]'
                  : 'bg-[#34C759]/15 text-[#34C759]'
              }`}>
                {runningCount > 0 ? `${runningCount} 运行中` : failedCount > 0 ? `${failedCount} 失败` : '已完成'}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-[#6E6E73]">进度</span>
                <span className="text-[10px] text-[#6E6E73]">{completedCount}/{totalCount} ({pct}%)</span>
              </div>
              <div className="h-1 bg-[#F5F5F7] rounded-full overflow-hidden">
                <div className="h-full bg-[#34C759] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
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

        {/* Right: Selected teammate detail */}
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
    );
  }

  // Sidebar layout: single column
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header with status */}
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1D1D1F]">Agent 团队</span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
            runningCount > 0 ? 'bg-[#007AFF]/15 text-[#007AFF]'
              : failedCount > 0 ? 'bg-[#FF3B30]/15 text-[#FF3B30]'
              : 'bg-[#34C759]/15 text-[#34C759]'
          }`}>
            {runningCount > 0 ? `${runningCount} 运行中` : failedCount > 0 ? `${failedCount} 失败` : '已完成'}
          </span>
        </div>
        {/* Compact progress */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#F5F5F7] rounded-full overflow-hidden">
            <div className="h-full bg-[#34C759] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] text-[#6E6E73] shrink-0">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Waiting resume banner */}
      {isWaitingResume && (
        <div className="mx-2.5 my-2 px-3 py-2 rounded-lg bg-[#007AFF]/10 text-[11px] text-[#007AFF] flex items-center gap-2 shrink-0">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          正在收集结果...
        </div>
      )}

      {/* Teammate cards */}
      <div className="py-1.5">
        {teammates.map((tm) => (
          <TeammateCard
            key={tm.taskId}
            teammate={tm}
            now={now}
            compact
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function TeammateCard({
  teammate: tm,
  now,
  compact = false,
  selected = false,
  onClick,
}: {
  teammate: TeammateState;
  now: number;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const color = avatarColor(tm.index);
  const elapsed = formatElapsed(tm.startedAt, tm.endedAt ?? (tm.status === 'running' ? undefined : now));
  const name = tm.description || `Agent ${tm.index + 1}`;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
        selected ? 'bg-[#007AFF]/8 border-l-2 border-[#007AFF]' : 'hover:bg-[#F5F5F7]/80 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar with status overlay */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {tm.index + 1}
          </div>
          {/* Status icon overlay */}
          {tm.status === 'running' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-[#007AFF] flex items-center justify-center">
              <svg className="h-1.5 w-1.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            </div>
          ) : tm.status === 'completed' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-[#34C759] flex items-center justify-center">
              <svg className="h-1.5 w-1.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M5 12l5 5L20 7" /></svg>
            </div>
          ) : tm.status === 'failed' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-[#FF3B30] flex items-center justify-center">
              <svg className="h-1.5 w-1.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 6l12 12M6 18L18 6" /></svg>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Row 1: Name + Status badge */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#1D1D1F] truncate">
              {name}
            </span>
            <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BG[tm.status]}`} style={{ color: STATUS_COLORS[tm.status] }}>
              {STATUS_LABEL[tm.status]}
            </span>
          </div>

          {/* Row 2: Description / current action */}
          {tm.status === 'running' ? (
            <div className="flex items-center gap-1 mt-0.5">
              {tm.currentToolName ? (
                <>
                  <svg className="h-2.5 w-2.5 animate-spin text-[#007AFF] shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  <span className="text-[10px] text-[#007AFF]">使用 {tm.currentToolName}...</span>
                </>
              ) : (
                <span className="text-[10px] text-[#6E6E73]">处理中...</span>
              )}
              <span className="text-[9px] text-[#AEAEB2] ml-auto shrink-0">{elapsed}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              {tm.status === 'completed' && (
                <span className="text-[10px] text-[#34C759]">已完成</span>
              )}
              {tm.status === 'failed' && (
                <span className="text-[10px] text-[#FF3B30]">执行失败</span>
              )}
              <span className="text-[9px] text-[#AEAEB2]">用时 {elapsed}</span>
              {tm.usage && tm.usage.toolUses != null && (
                <span className="text-[9px] text-[#AEAEB2]">· {tm.usage.toolUses} 工具</span>
              )}
            </div>
          )}

          {/* Row 3: Summary preview */}
          {tm.status === 'completed' && tm.summary && (
            <div className="mt-1 text-[10px] text-[#6E6E73] leading-relaxed line-clamp-2">
              {tm.summary.slice(0, 200)}{tm.summary.length > 200 ? '...' : ''}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
