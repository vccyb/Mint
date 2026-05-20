
import type { ReactNode } from 'react';
import { formatMessageTime } from '@/lib/format-time';

interface AgentMessageItemProps {
  agentId: string;
  agentName: string;
  agentAvatar: string;
  timestamp: number;
  children: ReactNode;
}

export function AgentMessageItem({
  agentId,
  agentName,
  agentAvatar,
  timestamp,
  children,
}: AgentMessageItemProps) {
  const initial = agentName.charAt(0).toUpperCase();

  return (
    <div className="px-6 py-3" id={`msg-agent-${agentId}-${timestamp}`}>
      <div className="mx-auto max-w-3xl flex gap-3">
        {/* Colored agent avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: agentAvatar }}
        >
          {initial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row: agent name + timestamp */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-foreground">{agentName}</span>
            <span className="text-xs text-text-tertiary">&middot;</span>
            <span className="text-xs text-text-tertiary">{formatMessageTime(timestamp)}</span>
          </div>

          {/* Message body */}
          <div className="text-sm leading-relaxed text-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
