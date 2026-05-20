'use client';

import { cn } from '@/lib/utils';

interface TokenUsageBarProps {
  tokenUsage: number;
  tokenBudget: number;
}

export function TokenUsageBar({ tokenUsage, tokenBudget }: TokenUsageBarProps) {
  const tokenPct = tokenBudget > 0 ? (tokenUsage / tokenBudget) * 100 : 0;
  const formatTokens = (n: number) => {
    if (n >= 1000) return n.toLocaleString();
    return String(n);
  };
  const tokenBarColor =
    tokenPct > 80 ? 'bg-destructive' : tokenPct > 50 ? 'bg-warning' : 'bg-success';

  return (
    <div className="px-3 pt-1">
      <div className="flex justify-between py-0.5">
        <span className="text-[9px] text-text-tertiary font-mono">
          {formatTokens(tokenUsage)} /{' '}
          {tokenBudget >= 1000 ? `${Math.round(tokenBudget / 1000)}K` : tokenBudget} tokens
        </span>
        <span
          className={cn(
            'text-[9px] font-mono',
            tokenPct > 80 ? 'text-destructive' : tokenPct > 50 ? 'text-warning' : 'text-success',
          )}
        >
          {tokenPct.toFixed(1)}%
        </span>
      </div>
      <div className="h-[2px] rounded-full bg-bg-hover">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', tokenBarColor)}
          style={{ width: `${Math.min(tokenPct, 100)}%` }}
        />
      </div>
    </div>
  );
}
