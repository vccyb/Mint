'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import type { SkillLoadInfo } from '@/types';

interface SkillActivityProps {
  skill: SkillLoadInfo;
}

export function SkillActivity({ skill }: SkillActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const isLoaded = skill.status === 'loaded';

  return (
    <div className="rounded-lg border border-border bg-card text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-bg-hover transition-all duration-150 text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
        <Zap className="h-3 w-3 shrink-0 text-warning" />
        <span className="shrink-0 font-semibold text-foreground">Skill</span>
        <span className="text-text-tertiary mx-1">&mdash;</span>
        <span className="flex-1 truncate text-muted-foreground font-mono">{skill.name}</span>
        {isLoaded ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-success bg-success/10">
            <CheckCircle2 className="h-3 w-3" />
            loaded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary bg-primary/10">
            <Loader2 className="h-3 w-3 animate-spin" />
            loading
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-1.5 bg-bg-warm">
          <div>
            <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1 font-semibold">
              Skill
            </p>
            <p className="text-[11px] font-mono text-foreground">{skill.name}</p>
          </div>
          {skill.description && (
            <div>
              <p className="text-text-tertiary text-[10px] uppercase tracking-wider mb-1 font-semibold">
                Description
              </p>
              <p className="text-[11px] text-muted-foreground">{skill.description}</p>
            </div>
          )}
          {isLoaded && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-[11px] text-text-tertiary">
                Skill loaded into agent context
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
