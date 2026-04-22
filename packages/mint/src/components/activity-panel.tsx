'use client';

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
  Check,
  XCircle,
} from 'lucide-react';
import type { ToolCallInfo, SkillLoadInfo } from '@/types';

// --- Reusable helpers (from tool-activity.tsx) ---

function getToolIcon(name: string) {
  switch (name) {
    case 'Bash':
      return Terminal;
    case 'Read':
    case 'file':
      return FileText;
    case 'Write':
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

// --- Grouping types ---

interface ActivityGroup {
  skill: SkillLoadInfo | null;
  tools: ToolCallInfo[];
}

function groupActivities(
  skillLoads: SkillLoadInfo[],
  toolCalls: ToolCallInfo[],
): ActivityGroup[] {
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
      // No skill loaded yet — standalone group
      const standalone: ActivityGroup = { skill: null, tools: [tool] };
      groups.push(standalone);
      currentGroup = standalone;
    }
  }

  return groups;
}

// --- Sub-components ---

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
        className="flex items-center gap-2 py-1 text-xs hover:bg-bg-warm rounded px-1.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <span className="shrink-0 font-medium text-text-secondary">{tool.name}</span>
        <span className="flex-1 truncate font-mono text-text-tertiary text-[11px]">
          {getToolSummary(tool)}
        </span>
        {elapsed && (
          <span className="text-[10px] text-text-tertiary font-mono tabular-nums shrink-0">
            {elapsed}
          </span>
        )}
        {isRunning ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
        ) : isError ? (
          <XCircle className="h-3 w-3 shrink-0 text-red-500" />
        ) : (
          <Check className="h-3 w-3 shrink-0 text-green-600" />
        )}
      </div>

      {expanded && (
        <div className="ml-6 mr-2 mb-1 space-y-1.5 border-l border-border pl-3">
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-0.5 font-semibold">
                Input
              </p>
              <pre className="bg-bg-warm rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-relaxed">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-0.5 font-semibold">
                Output
              </p>
              <pre className="bg-bg-warm rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-relaxed max-h-48 whitespace-pre-wrap break-all">
                {tool.result.length > 3000
                  ? tool.result.slice(0, 3000) + '\n... (truncated)'
                  : tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SkillGroupHeader({ skill }: { skill: SkillLoadInfo }) {
  return (
    <div className="flex items-center gap-2 py-1 px-1.5 text-xs">
      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      <span className="font-medium text-text-secondary">{skill.name}</span>
      {skill.description && (
        <span className="text-[10px] text-text-tertiary truncate">{skill.description}</span>
      )}
      <span className="text-[10px] text-green-600 shrink-0">loaded</span>
    </div>
  );
}

// --- Summary helpers ---

function computeSummary(
  toolCount: number,
  skillLoads: SkillLoadInfo[],
  totalDuration: number | null,
  isStreaming: boolean,
): string {
  const parts: string[] = [];

  parts.push(`${toolCount} tool${toolCount !== 1 ? 's' : ''}`);

  if (skillLoads.length === 1) {
    parts.push(`⚡ ${skillLoads[0].name}`);
  } else if (skillLoads.length > 1) {
    parts.push(`⚡ ${skillLoads.length} skills`);
  }

  if (totalDuration !== null) {
    parts.push(formatDuration(totalDuration));
  }

  if (isStreaming) {
    parts.push('running...');
  }

  return parts.join(' · ');
}

// --- Main component ---

interface ActivityPanelProps {
  toolCalls: ToolCallInfo[];
  skillLoads?: SkillLoadInfo[];
  isStreaming?: boolean;
}

export function ActivityPanel({ toolCalls, skillLoads, isStreaming }: ActivityPanelProps) {
  const [expanded, setExpanded] = useState(isStreaming ?? false);
  const userToggledRef = useRef(false);

  // Auto-collapse when streaming ends (unless user manually expanded)
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

  // Compute total duration from tool calls
  const totalDuration = toolCalls.some((t) => t.startedAt)
    ? toolCalls.reduce((max, t) => {
        if (!t.startedAt) return max;
        const end = t.completedAt ?? Date.now();
        return Math.max(max, end - t.startedAt);
      }, 0)
    : null;

  const summary = computeSummary(toolCalls.length, skills, totalDuration, isStreaming ?? false);
  const hasRunning = toolCalls.some((t) => t.status === 'running');

  return (
    <div className="mt-2">
      {/* Summary header — clickable toggle */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors w-full text-left py-0.5"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate">{summary}</span>
        {hasRunning && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-1">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.skill ? (
                <div>
                  <SkillGroupHeader skill={group.skill} />
                  <div className="ml-4">
                    {group.tools.map((tool) => (
                      <ToolRow key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {group.tools.map((tool) => (
                    <ToolRow key={tool.id} tool={tool} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
