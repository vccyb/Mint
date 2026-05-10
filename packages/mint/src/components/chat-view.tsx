'use client';

import { useRef, useState, useEffect } from 'react';
import { MessageList } from './message-list';
import { MessageInput, type MessageInputHandle } from './message-input';
import type { ChatMessage, Attachment, MentionChip } from '@/types';

interface ChatViewProps {
  messages: ChatMessage[];
  sessionKey?: string | null;
  isStreaming: boolean;
  streamStartTime?: number | null;
  onSend: (message: string, attachments?: Attachment[], mentionedTools?: unknown[], enableThinking?: boolean) => void;
  onStop?: () => void;
}

export function ChatView({
  messages,
  sessionKey,
  isStreaming,
  streamStartTime,
  onSend,
  onStop,
}: ChatViewProps) {
  const inputRef = useRef<MessageInputHandle>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  // Auto-focus input when messages change
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages.length]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <MessageList messages={messages} isStreaming={isStreaming} streamStartTime={streamStartTime} onEditMessage={(_id, content) => setEditingContent(content)} />
      <MessageInput
        ref={inputRef}
        sessionKey={sessionKey}
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        externalValue={editingContent}
        withContainer={false}
        thinkingEnabled={thinkingEnabled}
        onThinkingToggle={() => setThinkingEnabled(!thinkingEnabled)}
      />
    </div>
  );
}
