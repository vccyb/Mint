'use client';

import {
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { McpServerConfig, McpConnectionTestResult } from '@/types/mcp';

interface McpServerCardProps {
  config: McpServerConfig;
  testResult?: McpConnectionTestResult;
  isTesting: boolean;
  isExpanded: boolean;
  deleting: string | null;
  onToggle: (id: string) => void;
  onTest: (config: McpServerConfig) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export function McpServerCard({
  config,
  testResult,
  isTesting,
  isExpanded,
  deleting,
  onToggle,
  onTest,
  onDelete,
  onToggleExpand,
}: McpServerCardProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Server header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-bg">
        <button
          onClick={() => onToggleExpand(config.id)}
          className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover"
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {/* Status indicator */}
        {testResult?.status === 'connected' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        ) : testResult?.status === 'error' ? (
          <XCircle className="h-3.5 w-3.5 text-error shrink-0" />
        ) : (
          <div
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              config.enabled ? 'bg-text-tertiary' : 'bg-border',
            )}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-text truncate">{config.name}</span>
            {testResult && testResult.tools.length > 0 && (
              <span className="pill text-[10px] font-semibold bg-warning/10 text-warning">
                {testResult.tools.length} tool{testResult.tools.length !== 1 ? 's' : ''}
              </span>
            )}
            {!config.enabled && (
              <span className="pill text-[10px] font-semibold bg-bg-warm text-text-tertiary">
                Disabled
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-tertiary font-mono truncate">
            {config.command} {config.args.join(' ')}
          </p>
        </div>

        <button
          onClick={() => onToggle(config.id)}
          className={cn(
            'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
            config.enabled
              ? 'bg-success/10 text-success hover:bg-success/15'
              : 'bg-bg-warm text-text-tertiary hover:bg-bg-hover',
          )}
        >
          {config.enabled ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() => onTest(config)}
          disabled={isTesting}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        >
          {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Test
        </button>

        <button
          onClick={() => onDelete(config.id)}
          disabled={deleting === config.id}
          className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-error/5 hover:text-error transition-colors disabled:opacity-50"
        >
          {deleting === config.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-2 bg-bg-warm/50">
          {testResult?.error && <p className="text-xs text-error mb-2">{testResult.error}</p>}
          {testResult && testResult.tools.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
                Available Tools
              </p>
              {testResult.tools.map((tool) => (
                <div key={tool.name} className="rounded border border-border bg-bg px-2 py-1.5">
                  <span className="text-xs font-mono font-semibold text-text">{tool.name}</span>
                  {tool.description && (
                    <p className="text-[10px] text-text-secondary mt-0.5">{tool.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : testResult?.status === 'connected' ? (
            <p className="text-xs text-text-tertiary">No tools exposed by this server.</p>
          ) : !testResult ? (
            <p className="text-xs text-text-tertiary">Click &quot;Test&quot; to discover tools.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
