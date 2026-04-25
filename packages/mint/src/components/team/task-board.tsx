'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { TeamTask, AgentDefinition, TaskStatus } from '@/types';

interface TaskBoardProps {
  tasks: TeamTask[];
  agents: AgentDefinition[];
}

/** Build a map from agent ID to agent for quick lookup */
function buildAgentMap(agents: AgentDefinition[]): Map<string, AgentDefinition> {
  return new Map(agents.map((a) => [a.id, a]));
}

const TASK_ICON: Record<TaskStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3 w-3 text-[#34C759] shrink-0" />,
  in_progress: <Loader2 className="h-3 w-3 text-[#007AFF] shrink-0 animate-spin" />,
  pending: <Circle className="h-3 w-3 text-[#AEAEB2] shrink-0" />,
  error: <XCircle className="h-3 w-3 text-[#FF3B30] shrink-0" />,
};

const TASK_TITLE_CLASS: Record<TaskStatus, string> = {
  completed: 'line-through text-[#AEAEB2]',
  in_progress: 'font-semibold text-[#1D1D1F]',
  pending: 'text-[#AEAEB2]',
  error: 'text-[#FF3B30]',
};

export function TaskBoard({ tasks, agents }: TaskBoardProps) {
  const agentMap = buildAgentMap(agents);
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <div className="px-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-[#6E6E73]">
            任务进度
          </span>
          <span className="text-[10px] text-[#6E6E73]">
            {completed}/{total} ({pct}%)
          </span>
        </div>
        <div className="h-1.5 bg-[#F5F5F7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#34C759] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-0.5">
        {tasks.map((task) => {
          const agent = agentMap.get(task.assigneeId);
          return (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F5F5F7]/60 transition-colors"
            >
              {/* Status icon */}
              {TASK_ICON[task.status]}

              {/* Title */}
              <span className={`text-[11px] flex-1 min-w-0 truncate ${TASK_TITLE_CLASS[task.status]}`}>
                {task.title}
              </span>

              {/* Assignee dot + name */}
              {agent && (
                <div className="flex items-center gap-1 shrink-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: agent.avatar }}
                  />
                  <span className="text-[9px] text-[#6E6E73] max-w-[60px] truncate">
                    {agent.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
