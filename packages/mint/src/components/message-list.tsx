'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { AutoScrollArea } from './ui/scroll-area';
import { MessageItem } from './message-item';
import { ConversationMinimap } from './conversation-minimap';
import type { ChatMessage } from '@/types';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  streamStartTime?: number | null;
  onEditMessage?: (id: string, content: string) => void;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
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
      <div className="mx-auto max-w-3xl flex items-center gap-2 text-xs text-text-tertiary">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <span>正在思考...</span>
        <span className="font-mono text-[10px] bg-bg-warm rounded px-1.5 py-0.5">
          {fmt(elapsed)}
        </span>
      </div>
    </div>
  );
}

export function MessageList({ messages, isStreaming, streamStartTime, onEditMessage, onApprovePlan }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-xs">
          <p className="text-sm font-medium text-text-secondary">Start a conversation</p>
          <p className="text-xs text-text-tertiary mt-1">
            Type a message below to begin
          </p>
        </div>
      </div>
    );
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
            />
          ))}
          {isStreaming && <StreamingIndicator startTime={streamStartTime ?? null} />}
        </div>
      </AutoScrollArea>
      <ConversationMinimap messages={messages} />
    </div>
  );
}
