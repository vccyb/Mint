export function DetailSectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-muted-foreground">
      {icon}
      {children}
    </div>
  );
}

export function CommBubble({
  direction,
  label,
  content,
  time,
  isResult = false,
  isPending = false,
}: {
  direction: 'outgoing' | 'incoming';
  label: string;
  content: string;
  time?: number;
  isResult?: boolean;
  isPending?: boolean;
}) {
  const isOut = direction === 'outgoing';
  return (
    <div className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[8px] font-medium text-text-tertiary">{label}</span>
        {time != null && (
          <span className="text-[8px] text-[#D1D1D6]">
            {new Date(time).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-[10px] leading-relaxed ${
          isPending
            ? 'bg-bg-warm text-text-tertiary border border-dashed border-[#D1D1D6]'
            : isOut
              ? 'bg-primary/10 text-foreground border border-primary/15'
              : isResult
                ? 'bg-success/8 text-foreground border border-success/15'
                : 'bg-bg-warm text-muted-foreground border border-transparent'
        }`}
      >
        {isPending ? (
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-2 w-2 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
            </svg>
            {content}
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-bg-warm px-3 py-2 min-w-[60px]">
      <span className="text-[13px] font-semibold text-foreground">{value}</span>
      <span className="text-[9px] text-text-tertiary mt-0.5">{label}</span>
    </div>
  );
}
