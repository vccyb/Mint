'use client';

import type { AgentDefinition } from '@/types';
import { useRightPanel } from '../right-panel';

interface CollapsedTeamBarProps {
  agents: AgentDefinition[];
}

export function CollapsedTeamBar({ agents }: CollapsedTeamBarProps) {
  const { setPanelState, setActiveTab } = useRightPanel();

  const handleClick = () => {
    setActiveTab('team');
    setPanelState('visible');
  };

  const statusColors: Record<string, string> = {
    idle: 'bg-[#AEAEB2]',
    running: 'bg-[#007AFF]',
    completed: 'bg-[#34C759]',
    error: 'bg-[#FF3B30]',
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-white hover:bg-[#F5F5F7] transition-colors cursor-pointer"
    >
      {/* Agent status dots */}
      <div className="flex -space-x-0.5">
        {agents.slice(0, 4).map((agent) => (
          <div
            key={agent.id}
            className={`w-2 h-2 rounded-full border border-white ${statusColors[agent.status] ?? 'bg-[#AEAEB2]'}`}
          />
        ))}
      </div>
      <span className="text-[10px] text-[#6E6E73]">
        {agents.length} 个代理
      </span>
    </button>
  );
}
