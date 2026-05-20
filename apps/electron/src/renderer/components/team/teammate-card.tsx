import type { TeammateState } from '@/types';
import {
  avatarColor,
  formatElapsed,
  STATUS_BG,
  STATUS_COLORS,
  STATUS_LABEL,
  teammateName,
} from './teammate-shared';

export interface TeammateCardProps {
  teammate: TeammateState;
  now: number;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export function TeammateCard({
  teammate: tm,
  now,
  compact = false,
  selected = false,
  onClick,
}: TeammateCardProps) {
  const color = avatarColor(tm.index);
  const elapsed = formatElapsed(
    tm.startedAt,
    tm.endedAt ?? (tm.status === 'running' ? undefined : now),
  );
  const name = teammateName(tm);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
        selected
          ? 'bg-primary/8 border-l-2 border-primary'
          : 'hover:bg-bg-warm/80 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar with status overlay */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {tm.index + 1}
          </div>
          {tm.status === 'running' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-primary flex items-center justify-center">
              <svg className="h-1.5 w-1.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="32"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : tm.status === 'completed' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-success flex items-center justify-center">
              <svg
                className="h-1.5 w-1.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
          ) : tm.status === 'failed' ? (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-destructive flex items-center justify-center">
              <svg
                className="h-1.5 w-1.5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              >
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-foreground truncate">{name}</span>
            <span
              className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BG[tm.status]}`}
              style={{ color: STATUS_COLORS[tm.status] }}
            >
              {STATUS_LABEL[tm.status]}
            </span>
          </div>

          {tm.status === 'running' ? (
            <div className="flex items-center gap-1 mt-0.5">
              {tm.currentToolName ? (
                <>
                  <svg
                    className="h-2.5 w-2.5 animate-spin text-primary shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray="32"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[10px] text-primary">使用 {tm.currentToolName}...</span>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">处理中...</span>
              )}
              <span className="text-[9px] text-text-tertiary ml-auto shrink-0">{elapsed}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              {tm.status === 'completed' && (
                <span className="text-[10px] text-success">已完成</span>
              )}
              {tm.status === 'failed' && (
                <span className="text-[10px] text-destructive">执行失败</span>
              )}
              <span className="text-[9px] text-text-tertiary">用时 {elapsed}</span>
              {tm.usage && tm.usage.toolUses != null && (
                <span className="text-[9px] text-text-tertiary">· {tm.usage.toolUses} 工具</span>
              )}
            </div>
          )}

          {tm.status === 'completed' && tm.summary && (
            <div className="mt-1 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
              {tm.summary.slice(0, 200)}
              {tm.summary.length > 200 ? '...' : ''}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
