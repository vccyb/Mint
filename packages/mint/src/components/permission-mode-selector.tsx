'use client';

import { Zap, Shield, Map } from 'lucide-react';

type PermMode = 'bypassPermissions' | 'default' | 'plan';

const MODES: PermMode[] = ['bypassPermissions', 'default', 'plan'];

const MODE_CONFIG: Record<PermMode, {
  icon: typeof Zap;
  label: string;
  description: string;
  activeClass: string;
}> = {
  bypassPermissions: {
    icon: Zap,
    label: '自动',
    description: '自动执行所有工具调用',
    activeClass: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  default: {
    icon: Shield,
    label: '确认',
    description: '危险操作需确认',
    activeClass: 'bg-primary-light text-primary-text border-primary/20',
  },
  plan: {
    icon: Map,
    label: '规划',
    description: '仅规划不执行',
    activeClass: 'bg-success/8 text-success border-success/20',
  },
};

interface PermissionModeSelectorProps {
  mode: PermMode;
  onModeChange: (mode: PermMode) => void;
  onTogglePlanMode?: () => void;
  shortcutLabel?: string;
}

export function PermissionModeSelector({
  mode,
  onModeChange,
  onTogglePlanMode,
  shortcutLabel,
}: PermissionModeSelectorProps) {
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  const cycleMode = () => {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + 1) % MODES.length]!;
    onModeChange(next);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-bg-warm/80 p-1">
      <button
        type="button"
        onClick={onTogglePlanMode ?? cycleMode}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
          mode === 'plan'
            ? MODE_CONFIG.plan.activeClass
            : 'border-transparent bg-transparent text-text-secondary hover:bg-bg'
        }`}
        title={`规划：${MODE_CONFIG.plan.description}${shortcutLabel ? `（${shortcutLabel}）` : ''}`}
      >
        <Map className="h-3 w-3" />
        规划
        {shortcutLabel && <span className="text-[10px] text-text-tertiary">{shortcutLabel}</span>}
      </button>
      <button
        type="button"
        onClick={cycleMode}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${config.activeClass}`}
        title={`${config.label}：${config.description}（点击切换模式）`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </button>
    </div>
  );
}
