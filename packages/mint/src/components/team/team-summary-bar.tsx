import type { TeammateState } from '@/types';

export interface TeamSummaryBarProps {
  teammates: TeammateState[];
  compact?: boolean;
}

export function TeamSummaryBar({ teammates, compact = false }: TeamSummaryBarProps) {
  const completedCount = teammates.filter((t) => t.status === 'completed').length;
  const runningCount = teammates.filter((t) => t.status === 'running').length;
  const failedCount = teammates.filter((t) => t.status === 'failed').length;
  const totalCount = teammates.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const statusLabel = runningCount > 0
    ? `${runningCount} 运行中`
    : failedCount > 0
      ? `${failedCount} 失败`
      : '已完成';

  const statusClass = runningCount > 0
    ? 'bg-[#007AFF]/15 text-[#007AFF]'
    : failedCount > 0
      ? 'bg-[#FF3B30]/15 text-[#FF3B30]'
      : 'bg-[#34C759]/15 text-[#34C759]';

  if (compact) {
    return (
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#1D1D1F]">Agent 团队</span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-[#F5F5F7] rounded-full overflow-hidden">
            <div className="h-full bg-[#34C759] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[9px] text-[#6E6E73] shrink-0">{completedCount}/{totalCount}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#1D1D1F]">Agent 团队</span>
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
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
  );
}
