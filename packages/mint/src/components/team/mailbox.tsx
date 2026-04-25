'use client';

import type { MailboxMessage, AgentDefinition } from '@/types';
import { formatMessageTime } from '@/lib/format-time';

interface MailboxProps {
  messages: MailboxMessage[];
  agents: AgentDefinition[];
}

const TYPE_BADGE: Record<
  MailboxMessage['type'],
  { label: string; className: string }
> = {
  info: { label: '信息', className: 'bg-[#007AFF]/10 text-[#007AFF]' },
  question: { label: '提问', className: 'bg-[#FF9500]/10 text-[#FF9500]' },
  result: { label: '结果', className: 'bg-[#34C759]/10 text-[#34C759]' },
  handoff: { label: '交接', className: 'bg-[#AF52DE]/10 text-[#AF52DE]' },
};

function buildAgentMap(agents: AgentDefinition[]): Map<string, AgentDefinition> {
  return new Map(agents.map((a) => [a.id, a]));
}

export function Mailbox({ messages, agents }: MailboxProps) {
  const agentMap = buildAgentMap(agents);

  if (messages.length === 0) {
    return (
      <div className="text-[10px] text-[#AEAEB2] text-center py-4">
        暂无消息
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {messages.map((msg) => {
        const from = agentMap.get(msg.fromAgentId);
        const isBroadcast = msg.toAgentId === '*';
        const to = isBroadcast ? null : agentMap.get(msg.toAgentId);
        const badge = TYPE_BADGE[msg.type];

        return (
          <div
            key={msg.id}
            className="px-3 py-1.5 hover:bg-[#F5F5F7]/60 transition-colors"
          >
            {/* From → To row */}
            <div className="flex items-center gap-1 mb-0.5">
              {from && (
                <>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: from.avatar }}
                  />
                  <span className="text-[10px] font-medium text-[#1D1D1F] truncate max-w-[70px]">
                    {from.name}
                  </span>
                </>
              )}
              <span className="text-[9px] text-[#AEAEB2]">→</span>
              {isBroadcast ? (
                <span className="text-[10px] text-[#6E6E73]">全部</span>
              ) : (
                to && (
                  <>
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: to.avatar }}
                    />
                    <span className="text-[10px] font-medium text-[#1D1D1F] truncate max-w-[70px]">
                      {to.name}
                    </span>
                  </>
                )
              )}
              <div className="flex-1" />
              <span
                className={`text-[8px] px-1 py-0.5 rounded shrink-0 ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            {/* Content */}
            <p className="text-[10px] text-[#6E6E73] font-mono leading-tight break-all line-clamp-3">
              {msg.content}
            </p>

            {/* Timestamp */}
            <span className="text-[8px] text-[#AEAEB2]">
              {formatMessageTime(msg.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
