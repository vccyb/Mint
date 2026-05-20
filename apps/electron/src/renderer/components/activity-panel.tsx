
import { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  FileText,
  Pencil,
  Search,
  FolderSearch,
  Wrench,
  Loader2,
  Zap,
  ChevronDown,
  ChevronRight,
  FilePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCallInfo, SkillLoadInfo } from '@/types';

function getToolIcon(name: string) {
  switch (name) {
    case 'Bash':
      return Terminal;
    case 'Read':
    case 'file':
      return FileText;
    case 'Write':
      return FilePlus;
    case 'Edit':
      return Pencil;
    case 'Grep':
      return Search;
    case 'Glob':
    case 'LS':
      return FolderSearch;
    default:
      return Wrench;
  }
}

function getToolSummary(tool: ToolCallInfo): string {
  const { name, args } = tool;
  const a = args as Record<string, string>;
  switch (name) {
    case 'Bash':
      return a.command ? `$ ${a.command}` : 'Run command';
    case 'Read':
      return a.file_path ?? a.filePath ?? 'Read file';
    case 'Write':
      return a.file_path ?? a.filePath ?? 'Write file';
    case 'Edit':
      return a.file_path ?? a.filePath ?? 'Edit file';
    case 'Grep':
      return a.pattern ?? 'Search';
    case 'Glob':
      return a.pattern ?? 'Find files';
    default:
      return name;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface ActivityGroup {
  skill: SkillLoadInfo | null;
  tools: ToolCallInfo[];
}

function groupActivities(skillLoads: SkillLoadInfo[], toolCalls: ToolCallInfo[]): ActivityGroup[] {
  if (skillLoads.length === 0) {
    return [{ skill: null, tools: toolCalls }];
  }
  const groups: ActivityGroup[] = [];
  let currentGroup: ActivityGroup | null = null;
  let skillIdx = 0;
  for (const tool of toolCalls) {
    if (skillIdx < skillLoads.length) {
      currentGroup = { skill: skillLoads[skillIdx], tools: [] };
      groups.push(currentGroup);
      skillIdx++;
    }
    if (currentGroup) {
      currentGroup.tools.push(tool);
    } else {
      const standalone: ActivityGroup = { skill: null, tools: [tool] };
      groups.push(standalone);
      currentGroup = standalone;
    }
  }
  return groups;
}

function ToolRow({ tool }: { tool: ToolCallInfo }) {
  const Icon = getToolIcon(tool.name);
  const isRunning = tool.status === 'running';
  const isError = tool.status === 'error';
  const [expanded, setExpanded] = useState(false);
  const elapsed = tool.startedAt
    ? formatDuration((tool.completedAt ?? Date.now()) - tool.startedAt)
    : null;

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 text-xs hover:bg-bg-hover rounded-lg px-2 cursor-pointer transition-colors duration-150"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className="h-3 w-3 shrink-0 text-text-tertiary" />
        <span className="shrink-0 font-semibold text-foreground font-mono text-[11px]">
          {tool.name}
        </span>
        <span className="text-text-tertiary">&middot;</span>
        <span className="flex-1 truncate text-muted-foreground font-mono text-[11px]">
          {getToolSummary(tool)}
        </span>
        {elapsed && !isRunning && (
          <span className="text-[10px] text-text-tertiary font-mono tabular-nums shrink-0">
            {elapsed}
          </span>
        )}
        {isRunning ? (
          <div className="h-3 w-3 shrink-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        ) : isError ? (
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
        ) : (
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
        )}
      </div>
      {expanded && (
        <div className={cn('ml-5 mr-2 mb-1 space-y-1.5 border-l pl-3', isError ? 'border-l-destructive/30' : 'border-l-border')}>
          {tool.result && (
            <pre className="bg-bg-warm rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-relaxed max-h-48 whitespace-pre-wrap break-all">
              {tool.result.length > 3000
                ? tool.result.slice(0, 3000) + '\n... (truncated)'
                : tool.result}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function SkillGroupHeader({ skill }: { skill: SkillLoadInfo }) {
  return (
    <div className="flex items-center gap-2 py-1 px-2 text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span className="font-medium text-muted-foreground font-mono">{skill.name}</span>
      <span className="text-[10px] text-success shrink-0">loaded</span>
    </div>
  );
}

function computeSummary(
  toolCount: number,
  skillLoads: SkillLoadInfo[],
  totalDuration: number | null,
  isStreaming: boolean,
): string {
  const parts: string[] = [];
  parts.push(`${toolCount} 工具`);
  if (skillLoads.length === 1) {
    parts.push(`${skillLoads[0].name}`);
  } else if (skillLoads.length > 1) {
    parts.push(`${skillLoads.length} skills`);
  }
  if (totalDuration !== null) {
    parts.push(formatDuration(totalDuration));
  }
  if (isStreaming) {
    parts.push('running...');
  }
  return parts.join(' · ');
}

interface ActivityPanelProps {
  toolCalls: ToolCallInfo[];
  skillLoads?: SkillLoadInfo[];
  isStreaming?: boolean;
}

export function ActivityPanel({ toolCalls, skillLoads, isStreaming }: ActivityPanelProps) {
  const [expanded, setExpanded] = useState(isStreaming ?? false);
  const userToggledRef = useRef(false);

  useEffect(() => {
    if (!isStreaming && !userToggledRef.current) {
      setExpanded(false);
    }
  }, [isStreaming]);

  const handleToggle = () => {
    userToggledRef.current = true;
    setExpanded((prev) => !prev);
  };

  const skills = skillLoads ?? [];
  const groups = groupActivities(skills, toolCalls);
  const totalDuration = toolCalls.some((t) => t.startedAt)
    ? toolCalls.reduce((max, t) => {
        if (!t.startedAt) return max;
        return Math.max(max, (t.completedAt ?? Date.now()) - t.startedAt);
      }, 0)
    : null;

  const summary = computeSummary(toolCalls.length, skills, totalDuration, isStreaming ?? false);
  const hasRunning = toolCalls.some((t) => t.status === 'running');
  const completedCount = toolCalls.filter((t) => t.status === 'completed').length;
  const modifiedFiles = new Set(
    toolCalls
      .filter((t) => t.status === 'completed' && (t.name === 'Edit' || t.name === 'Write'))
      .map((t) => {
        const a = t.args as Record<string, string>;
        return a.file_path ?? a.filePath ?? '';
      })
      .filter(Boolean),
  ).size;

  return (
    <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden">
      {/* Summary header */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-bg-hover transition-colors text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
        <span className="truncate font-medium">{summary}</span>
        {!isStreaming && completedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-success bg-success/10 shrink-0">
            已完成
          </span>
        )}
        {hasRunning && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
        {hasRunning && toolCalls.length > 0 && (
          <div className="flex-1 h-[2px] bg-bg-hover rounded-full overflow-hidden min-w-[40px]">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / toolCalls.length) * 100}%` }}
            />
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {groups.map((group, gi) => (
            <div key={gi} className="px-1 py-1">
              {group.skill && <SkillGroupHeader skill={group.skill} />}
              <div className={group.skill ? 'ml-4' : ''}>
                {group.tools.map((tool) => (
                  <ToolRow key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          ))}
          {/* Summary bar at bottom */}
          {!isStreaming && (
            <div className="border-t border-border px-3 py-1.5 text-[10px] text-text-tertiary">
              {completedCount} 个工具已完成
              {modifiedFiles > 0 && ` · 修改 ${modifiedFiles} 个文件`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
