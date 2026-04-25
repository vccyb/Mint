'use client';

import { useState } from 'react';
import type { Team } from '@/types';
import { TeamHeader } from './team-header';
import { TaskBoard } from './task-board';
import { AgentCard } from './agent-card';
import { Mailbox } from './mailbox';

interface TeamPanelProps {
  team: Team | null;
  fullscreen?: boolean;
}

export function TeamPanel({ team, fullscreen = false }: TeamPanelProps) {
  const [mailboxExpanded, setMailboxExpanded] = useState(false);

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[#AEAEB2] gap-3 p-6">
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
          <div className="text-[11px] font-medium text-[#6E6E73] mb-1">Agent 团队</div>
          <div className="text-[10px] text-[#AEAEB2] leading-relaxed">
            创建团队任务以查看<br />多代理协作进度
          </div>
        </div>
      </div>
    );
  }

  const taskTitleMap = new Map(
    team.tasks.map((t) => [t.id, t.title]),
  );

  if (fullscreen) {
    return (
      <div className="flex flex-1 min-h-0">
        {/* Left: Agent cards */}
        <div className="w-[220px] shrink-0 border-r border-border overflow-y-auto py-2">
          <SectionLabel>代理</SectionLabel>
          <div className="px-2.5 space-y-1.5">
            {team.agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                taskTitle={
                  agent.currentTaskId
                    ? taskTitleMap.get(agent.currentTaskId)
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Right: Task board + Mailbox */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <TeamHeader
            name={team.name}
            description={team.description}
            status={team.status}
          />
          <div className="py-2">
            <SectionLabel>任务看板</SectionLabel>
            <TaskBoard tasks={team.tasks} agents={team.agents} />
          </div>
          <div className="border-t border-border py-2">
            <SectionLabel>
              消息
              {team.mailbox.length > 0 && (
                <span className="ml-1 text-[8px] bg-[#007AFF]/10 text-[#007AFF] px-1 py-0.5 rounded">
                  {team.mailbox.length}
                </span>
              )}
            </SectionLabel>
            <Mailbox messages={team.mailbox} agents={team.agents} />
          </div>
        </div>
      </div>
    );
  }

  // Sidebar mode: single column
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <TeamHeader
        name={team.name}
        description={team.description}
        status={team.status}
      />

      <div className="border-b border-border py-2">
        <SectionLabel>任务看板</SectionLabel>
        <TaskBoard tasks={team.tasks} agents={team.agents} />
      </div>

      <div className="border-b border-border py-2">
        <SectionLabel>代理</SectionLabel>
        <div className="px-2.5 space-y-1.5">
          {team.agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              taskTitle={
                agent.currentTaskId
                  ? taskTitleMap.get(agent.currentTaskId)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Collapsible Mailbox */}
      <div className="py-2">
        <button
          onClick={() => setMailboxExpanded(!mailboxExpanded)}
          className="w-full px-3 mb-1.5 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center gap-1.5 cursor-pointer hover:text-[#1D1D1F] transition-colors"
        >
          <svg
            className={`h-2.5 w-2.5 transition-transform ${mailboxExpanded ? 'rotate-90' : ''}`}
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            <path d="M3 1l5 4-5 4z" />
          </svg>
          消息
          {team.mailbox.length > 0 && (
            <span className="text-[8px] bg-[#007AFF]/10 text-[#007AFF] px-1 py-0.5 rounded">
              {team.mailbox.length}
            </span>
          )}
        </button>
        {mailboxExpanded && (
          <Mailbox messages={team.mailbox.slice(-3)} agents={team.agents} />
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-1.5 text-[10px] font-semibold text-[#6E6E73] uppercase tracking-wide flex items-center">
      {children}
    </div>
  );
}
