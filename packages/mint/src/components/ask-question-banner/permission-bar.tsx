'use client';

import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionRequestData } from '@/types';

interface PermissionBarProps {
  request: PermissionRequestData;
  onDecision: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  pinned?: boolean;
}

export function PermissionBar({ request, onDecision, pinned = false }: PermissionBarProps) {
  const inputSummary = (() => {
    if (request.input.command) return `$ ${request.input.command}`;
    if (request.input.file_path || request.input.filePath) {
      return `${request.input.file_path ?? request.input.filePath}`;
    }
    if (request.input.content) return String(request.input.content).slice(0, 100);
    return '';
  })();

  return (
    <div
      className={cn(
        'rounded-xl border border-border shadow-sm bg-card',
        pinned && 'mx-auto max-w-[640px]',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 text-xs">
        <Shield className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span className="font-semibold text-warning">{request.toolName}</span>
        {inputSummary && (
          <span className="text-text-secondary font-mono truncate max-w-[400px]">
            {inputSummary}
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onDecision(request.requestId, 'deny')}
          className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          拒绝
        </button>
        <button
          onClick={() => onDecision(request.requestId, 'allow', request.input)}
          className="rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary-hover transition-colors cursor-pointer"
        >
          允许
        </button>
      </div>
    </div>
  );
}
