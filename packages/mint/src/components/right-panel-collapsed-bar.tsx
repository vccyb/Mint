'use client';

import { useRightPanel } from './right-panel';

interface RightPanelCollapsedBarProps {
  fileCount?: number;
  teamCount?: number;
  summary?: string;
}

export function RightPanelCollapsedBar({
  fileCount = 0,
  teamCount = 0,
  summary,
}: RightPanelCollapsedBarProps) {
  const { setPanelState, setActiveTab } = useRightPanel();

  const handleOpen = (tab: 'files' | 'team') => {
    setActiveTab(tab);
    setPanelState('visible');
  };

  // Build status dots: green for active agents, gray for idle
  const dots = [];
  if (teamCount > 0) {
    for (let i = 0; i < Math.min(teamCount, 3); i++) {
      dots.push(
        <div
          key={`dot-${i}`}
          className={`w-1.5 h-1.5 rounded-full ${
            i === 0 ? 'bg-success' : 'bg-text-tertiary'
          }`}
        />,
      );
    }
  }

  // Build summary text
  const summaryText =
    summary ??
    (teamCount > 0
      ? `${teamCount} 个代理运行中`
      : fileCount > 0
        ? `${fileCount} 个文件已修改`
        : null);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border bg-bg shrink-0">
      {/* Status dots */}
      {dots.length > 0 && (
        <div className="flex gap-0.5">{dots}</div>
      )}

      {/* Summary text */}
      {summaryText && (
        <span className="text-[10px] text-text-tertiary">{summaryText}</span>
      )}

      <div className="flex-1" />

      {/* Team button */}
      <button
        onClick={() => handleOpen('team')}
        className="text-[9px] px-2 py-0.5 rounded-md border border-border text-text-secondary hover:text-text hover:bg-bg-warm transition-colors cursor-pointer"
      >
        Team
      </button>

      {/* Files button */}
      <button
        onClick={() => handleOpen('files')}
        className="text-[9px] px-2 py-0.5 rounded-md border border-primary text-[#007AFF] font-medium hover:bg-[#E8F2FF] transition-colors cursor-pointer"
      >
        Files
      </button>
    </div>
  );
}
