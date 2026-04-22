'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal, FileText, Pencil, Search, FolderSearch, Wrench, Loader2, Clock, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DiffView, isDiffContent } from './diff-view';
import type { ToolCallInfo } from '@/types';

interface ToolActivityProps {
  tool: ToolCallInfo;
  startedAt?: number;
  completedAt?: number;
  defaultExpanded?: boolean;
}

function getToolIcon(name: string) {
  switch (name) {
    case 'Bash':
      return Terminal;
    case 'Read':
    case 'file':
      return FileText;
    case 'Write':
      return Pencil;
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

export function ToolActivity({ tool, startedAt, completedAt, defaultExpanded }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const Icon = getToolIcon(tool.name);
  const isRunning = tool.status === 'running';

  const elapsed = startedAt
    ? formatDuration((completedAt ?? Date.now()) - startedAt)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tool.result ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded border border-border bg-bg text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-bg-warm transition-colors text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
        <Icon className="h-3 w-3 shrink-0 text-text-tertiary" />
        <span className="shrink-0 font-semibold">{tool.name}</span>
        <span className="text-text-tertiary mx-1">&mdash;</span>
        <span className="flex-1 truncate text-text-secondary font-mono">
          {getToolSummary(tool)}
        </span>
        {elapsed && (
          <span className="flex items-center gap-1 text-[10px] text-text-tertiary shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {elapsed}
          </span>
        )}
        {isRunning ? (
          <Loader2 className="h-3 w-3 shrink-0 text-primary-text animate-spin" />
        ) : (
          <span className={cn(
            'pill text-[10px] font-semibold',
            tool.status === 'completed' && 'text-green-700 bg-green-50',
            tool.status === 'error' && 'text-red-700 bg-red-50',
          )}>
            {tool.status}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1 font-semibold">
                Input
              </p>
              <pre className="bg-bg-warm rounded p-2 overflow-x-auto text-[11px] font-mono leading-relaxed">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-text-tertiary text-[10px] uppercase tracking-wider font-semibold">
                  Output
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-text-tertiary hover:text-text transition-colors"
                >
                  {copied ? (
                    <><Check className="h-3 w-3" /><span className="text-[10px]">Copied</span></>
                  ) : (
                    <><Copy className="h-3 w-3" /><span className="text-[10px]">Copy</span></>
                  )}
                </button>
              </div>
              {isDiffContent(tool.result) ? (
                <DiffView content={tool.result.length > 5000 ? tool.result.slice(0, 5000) + '\n... (truncated)' : tool.result} />
              ) : (
                <pre className="bg-bg-warm rounded p-2 overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64 whitespace-pre-wrap break-all">
                  {tool.result.length > 5000 ? tool.result.slice(0, 5000) + '\n... (truncated)' : tool.result}
                </pre>
              )}
            </div>
          )}
          {isRunning && !tool.result && (
            <div className="flex items-center gap-2 text-text-tertiary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[11px]">Running...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
