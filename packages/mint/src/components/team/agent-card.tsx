'use client';

import type { AgentDefinition } from '@/types';

interface AgentCardProps {
  agent: AgentDefinition;
  taskTitle?: string;
}

/** Format elapsed time from a start timestamp */
function formatElapsed(startedAt: number | null, completedAt: number | null): string {
  if (!startedAt) return '';
  const end = completedAt ?? Date.now();
  const diffMs = end - startedAt;
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  return `${Math.floor(diffMs / 3_600_000)}h`;
}

const STATUS_CONFIG = {
  idle: { label: '待命', dotClass: 'bg-[#AEAEB2]' },
  running: { label: '运行中', dotClass: 'bg-[#007AFF] animate-pulse' },
  completed: { label: '已完成', dotClass: 'bg-[#34C759]' },
  error: { label: '错误', dotClass: 'bg-[#FF3B30]' },
} as const;

export function AgentCard({ agent, taskTitle }: AgentCardProps) {
  const cfg = STATUS_CONFIG[agent.status];
  const elapsed = formatElapsed(agent.startedAt, agent.completedAt);
  const initial = agent.name.charAt(0).toUpperCase();

  return (
    <div className="rounded-lg border border-border bg-white p-2.5 space-y-1.5">
      {/* Top row: avatar + name + status */}
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: agent.avatar }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-[#1D1D1F] truncate">
            {agent.name}
          </div>
          <div className="text-[9px] text-[#6E6E73] truncate">{agent.role}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
          <span className="text-[9px] text-[#6E6E73]">{cfg.label}</span>
          {elapsed && (
            <span className="text-[8px] text-[#AEAEB2]">{elapsed}</span>
          )}
        </div>
      </div>

      {/* Current task */}
      {agent.status === 'running' && taskTitle && (
        <div className="text-[10px] text-[#6E6E73] truncate pl-8">
          <span className="text-[#AEAEB2]">任务: </span>
          {taskTitle}
        </div>
      )}

      {/* Completed info */}
      {agent.status === 'completed' && elapsed && (
        <div className="text-[10px] text-[#AEAEB2] pl-8">
          用时 {elapsed}
        </div>
      )}

      {/* Error info */}
      {agent.status === 'error' && (
        <div className="text-[10px] text-[#FF3B30] pl-8 truncate">
          执行出错
        </div>
      )}
    </div>
  );
}
