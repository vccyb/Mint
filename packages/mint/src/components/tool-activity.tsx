'use client';

import { useState } from 'react';
import {
  Terminal,
  FileText,
  Pencil,
  Search,
  FolderSearch,
  Wrench,
  Loader2,
  Copy,
  Check,
  FilePlus,
} from 'lucide-react';
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

export function ToolActivity({ tool, startedAt, completedAt, defaultExpanded }: ToolActivityProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const Icon = getToolIcon(tool.name);
  const isRunning = tool.status === 'running';
  const isError = tool.status === 'error';

  const elapsed = startedAt
    ? formatDuration((completedAt ?? Date.now()) - startedAt)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(tool.result ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      'rounded-lg text-xs overflow-hidden',
      isRunning && 'border border-[#007AFF]/15 bg-[#007AFF]/[0.02]',
      !isRunning && 'border border-transparent',
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 hover:bg-[#EDEDF0] rounded-lg transition-all duration-150 text-left cursor-pointer"
      >
        <Icon className="h-3 w-3 shrink-0 text-[#AEAEB2]" />
        <span className="shrink-0 font-semibold text-[#1D1D1F] font-mono text-[11px]">
          {tool.name}
        </span>
        <span className="text-[#AEAEB2]">&middot;</span>
        <span className="flex-1 truncate text-[#6E6E73] font-mono text-[11px]">
          {getToolSummary(tool)}
        </span>
        {elapsed && !isRunning && (
          <span className="text-[10px] text-[#AEAEB2] font-mono tabular-nums shrink-0">
            {elapsed}
          </span>
        )}
        {isRunning ? (
          <div className="h-3 w-3 shrink-0 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin" />
        ) : isError ? (
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF3B30]" />
        ) : (
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#34C759]" />
        )}
      </button>

      {expanded && (
        <div className="px-2 pb-2 pt-1 space-y-2">
          {tool.args && Object.keys(tool.args).length > 0 && (
            <div>
              <p className="text-[#AEAEB2] text-[10px] uppercase tracking-wider mb-0.5 font-semibold">
                Input
              </p>
              <pre className="bg-[#F5F5F7] rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-relaxed">
                {JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result && (
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[#AEAEB2] text-[10px] uppercase tracking-wider font-semibold">
                  Output
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[#AEAEB2] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                >
                  {copied ? (
                    <><Check className="h-3 w-3 text-[#34C759]" /><span className="text-[10px]">Copied</span></>
                  ) : (
                    <><Copy className="h-3 w-3" /><span className="text-[10px]">Copy</span></>
                  )}
                </button>
              </div>
              {isDiffContent(tool.result) ? (
                <DiffView content={tool.result.length > 5000 ? tool.result.slice(0, 5000) + '\n... (truncated)' : tool.result} />
              ) : (
                <pre className="bg-[#F5F5F7] rounded p-1.5 overflow-x-auto text-[10px] font-mono leading-relaxed max-h-48 whitespace-pre-wrap break-all">
                  {tool.result.length > 5000 ? tool.result.slice(0, 5000) + '\n... (truncated)' : tool.result}
                </pre>
              )}
            </div>
          )}
          {isRunning && !tool.result && (
            <div className="flex items-center gap-2 text-[#AEAEB2]">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-[11px]">Running...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
