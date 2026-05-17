'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AutoScrollArea } from './ui/scroll-area';
import { MessageItem } from './message-item';
import { ConversationMinimap } from './conversation-minimap';
import { InlineTeamStatus } from './team/inline-team-status';
import type { ChatMessage, TeammateState } from '@/types';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamStartTime?: number | null;
  onEditMessage?: (id: string, content: string) => void;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
  hideLastTodoAndPlan?: boolean;
  teammates?: TeammateState[];
  isWaitingResume?: boolean;
  onViewTeam?: () => void;
  onFileClick?: (path: string) => void;
}

function StreamingIndicator({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - (startTime ?? Date.now())) / 1000),
  );
  const startRef = useRef(startTime ?? Date.now());

  useEffect(() => {
    startRef.current = startTime ?? Date.now();
    setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const fmt = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="px-6 py-3">
      <div className="mx-auto w-[80%] flex items-center gap-2 text-xs text-text-tertiary">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span>正在思考...</span>
        <span className="font-mono text-[10px] bg-bg-warm rounded px-1.5 py-0.5">
          {fmt(elapsed)}
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  const shortcuts = [
    { key: '@', label: '提及文件', desc: '插入文件引用' },
    { key: '/', label: '调用技能', desc: '使用预定义技能' },
    { key: '#', label: 'MCP 工具', desc: '调用外部工具' },
  ];

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center max-w-xs">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">开始对话</p>
        <p className="text-xs text-text-tertiary mt-1 mb-4">输入消息开始与 Mint 对话</p>
        <div className="space-y-1.5">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-text-tertiary">
              <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-bg-warm px-1.5 font-mono text-[10px] font-semibold text-muted-foreground">
                {s.key}
              </kbd>
              <span>{s.label}</span>
              <span className="text-text-tertiary/60">&mdash;</span>
              <span className="text-text-tertiary/60">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  isStreaming,
  streamStartTime,
  onEditMessage,
  onApprovePlan,
  hideLastTodoAndPlan,
  teammates,
  isWaitingResume,
  onViewTeam,
  onFileClick,
}: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 relative" data-message-list>
      <AutoScrollArea className="flex-1" trigger={messages}>
        <div>
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              onEditMessage={onEditMessage}
              streamStartTime={message.isStreaming ? streamStartTime : undefined}
              isLastMessage={index === messages.length - 1}
              onApprovePlan={onApprovePlan}
              hideTodoAndPlan={hideLastTodoAndPlan && index === messages.length - 1}
              onFileClick={onFileClick}
            />
          ))}
          {teammates && teammates.length > 0 && !hideLastTodoAndPlan && (
            <InlineTeamStatus
              teammates={teammates}
              isWaitingResume={isWaitingResume ?? false}
              onViewTeam={onViewTeam ?? (() => {})}
            />
          )}
          {teammates && teammates.length > 0 && hideLastTodoAndPlan && (
            <div className="px-6 py-1.5">
              <div className="mx-auto max-w-[640px] flex items-center gap-2 h-[28px] px-3 rounded-lg bg-bg-warm/60 text-[10px] text-muted-foreground">
                <div className="flex items-center -space-x-1">
                  {teammates.slice(0, 3).map((tm) => {
                    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
                    const color = colors[tm.index % colors.length];
                    return (
                      <div
                        key={tm.taskId}
                        className="w-3.5 h-3.5 rounded-full ring-1 ring-white"
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
                <span>
                  {teammates.filter((t) => t.status === 'running').length > 0
                    ? `${teammates.filter((t) => t.status === 'running').length} agents 运行中`
                    : `${teammates.length} agents 已完成`}
                </span>
                <button
                  onClick={onViewTeam}
                  className="ml-auto text-primary hover:text-primary-hover cursor-pointer"
                >
                  查看 →
                </button>
              </div>
            </div>
          )}
          {isStreaming && <StreamingIndicator startTime={streamStartTime ?? null} />}
        </div>
      </AutoScrollArea>
      <ConversationMinimap messages={messages} />
    </div>
  );
}
