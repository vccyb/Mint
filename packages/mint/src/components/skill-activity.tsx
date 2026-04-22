'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import type { SkillLoadInfo } from '@/types';

interface SkillActivityProps {
  skill: SkillLoadInfo;
}

export function SkillActivity({ skill }: SkillActivityProps) {
  const [expanded, setExpanded] = useState(false);

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
        <Zap className="h-3 w-3 shrink-0 text-amber-500" />
        <span className="shrink-0 font-semibold">Skill</span>
        <span className="text-text-tertiary mx-1">&mdash;</span>
        <span className="flex-1 truncate text-text-secondary font-mono">
          {skill.name}
        </span>
        <span className="pill text-[10px] font-semibold text-success bg-green-50">
          loaded
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-1.5">
          <div>
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1 font-semibold">
              Skill
            </p>
            <p className="text-[11px] font-mono">{skill.name}</p>
          </div>
          {skill.description && (
            <div>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1 font-semibold">
                Description
              </p>
              <p className="text-[11px] text-text-secondary">
                {skill.description}
              </p>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span className="text-[11px] text-text-tertiary">
              Skill loaded into agent context
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
