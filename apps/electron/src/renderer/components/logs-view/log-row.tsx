
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { type: string; message: string; stack?: string };
  traceId?: string;
}

export const LEVEL_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  debug: { bg: 'bg-bg-warm', text: 'text-muted-foreground', dot: 'bg-text-tertiary' },
  info: { bg: 'bg-primary-light/60', text: 'text-primary', dot: 'bg-primary' },
  warn: { bg: 'bg-[#FFF8E1]/60', text: 'text-warning', dot: 'bg-warning' },
  error: { bg: 'bg-[#FFE5E5]/60', text: 'text-destructive', dot: 'bg-destructive' },
};

export function LogRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: LogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const cfg = LEVEL_CONFIG[entry.level] ?? LEVEL_CONFIG.info;
  const time = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
  const hasDetails = (entry.data && Object.keys(entry.data).length > 0) || entry.error;

  return (
    <div className={`group ${expanded ? cfg.bg : 'hover:bg-[#FAFAFA]'} transition-colors`}>
      <button
        onClick={hasDetails ? onToggle : undefined}
        className={`flex items-center w-full px-6 py-2 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Expand chevron */}
        <span className="w-4 shrink-0">
          {hasDetails ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 text-text-tertiary" />
            ) : (
              <ChevronRight className="h-3 w-3 text-text-tertiary" />
            )
          ) : null}
        </span>

        {/* Level dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Time */}
        <span className="text-[10px] font-mono text-text-tertiary w-[72px] shrink-0 ml-2">{time}</span>

        {/* Level badge */}
        <span className={`text-[9px] font-semibold uppercase w-[36px] shrink-0 ${cfg.text}`}>
          {entry.level}
        </span>

        {/* Scope */}
        <span className="text-[10px] font-mono text-primary w-[140px] shrink-0 truncate">
          {entry.scope}
        </span>

        {/* Message */}
        <span className="text-[11px] text-foreground truncate flex-1 min-w-0">{entry.message}</span>

        {/* Error indicator */}
        {entry.error && (
          <span className="text-[9px] text-destructive bg-[#FFE5E5] px-1.5 py-0.5 rounded ml-2 shrink-0">
            {entry.error.type}
          </span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 pb-3 pl-[104px]">
          {entry.error && (
            <div className="mb-2 rounded-lg border border-destructive/20 bg-[#FFE5E5]/30 px-3 py-2">
              <div className="text-[11px] font-semibold text-destructive">
                {entry.error.type}: {entry.error.message}
              </div>
              {entry.error.stack && (
                <pre className="mt-1 text-[9px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                  {entry.error.stack}
                </pre>
              )}
            </div>
          )}
          {entry.data && Object.keys(entry.data).length > 0 && (
            <div className="rounded-lg border border-border/60 bg-[#F9FAFB] px-3 py-2">
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-[200px] overflow-y-auto">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
