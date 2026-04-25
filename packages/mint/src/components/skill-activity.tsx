'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Zap,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { SkillLoadInfo } from '@/types';

interface SkillActivityProps {
  skill: SkillLoadInfo;
}

export function SkillActivity({ skill }: SkillActivityProps) {
  const [expanded, setExpanded] = useState(false);
  const isLoaded = skill.status === 'loaded';

  return (
    <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-[#EDEDF0] transition-all duration-150 text-left cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-[#AEAEB2]" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-[#AEAEB2]" />
        )}
        <Zap className="h-3 w-3 shrink-0 text-[#FF9500]" />
        <span className="shrink-0 font-semibold text-[#1D1D1F]">Skill</span>
        <span className="text-[#AEAEB2] mx-1">&mdash;</span>
        <span className="flex-1 truncate text-[#6E6E73] font-mono">
          {skill.name}
        </span>
        {isLoaded ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#34C759] bg-[#34C759]/10">
            <CheckCircle2 className="h-3 w-3" />
            loaded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10">
            <Loader2 className="h-3 w-3 animate-spin" />
            loading
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-[rgba(0,0,0,0.08)] px-3 py-2 space-y-1.5 bg-[#F5F5F7]">
          <div>
            <p className="text-[#AEAEB2] text-[10px] uppercase tracking-wider mb-1 font-semibold">
              Skill
            </p>
            <p className="text-[11px] font-mono text-[#1D1D1F]">{skill.name}</p>
          </div>
          {skill.description && (
            <div>
              <p className="text-[#AEAEB2] text-[10px] uppercase tracking-wider mb-1 font-semibold">
                Description
              </p>
              <p className="text-[11px] text-[#6E6E73]">
                {skill.description}
              </p>
            </div>
          )}
          {isLoaded && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-[#34C759]" />
              <span className="text-[11px] text-[#AEAEB2]">
                Skill loaded into agent context
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
