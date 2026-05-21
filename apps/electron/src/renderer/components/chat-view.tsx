
import { useRef, useState, useEffect } from 'react';
import { MessageList } from './message-list';
import { MessageInput, type MessageInputHandle } from './message-input';
import type { ChatMessage, Attachment, MentionChip } from '@/types';

interface ChatViewProps {
  messages: ChatMessage[];
  sessionKey?: string | null;
  isStreaming: boolean;
  streamStartTime?: number | null;
  onSend: (
    message: string,
    attachments?: Attachment[],
    mentionedTools?: unknown[],
    enableThinking?: boolean,
  ) => void;
  onStop?: () => void;
  onForkMessage?: (messageId: string) => Promise<void>;
  onOpenSettings?: () => void;
  suggestions?: string[];
}

export function ChatView({
  messages,
  sessionKey,
  isStreaming,
  streamStartTime,
  onSend,
  onStop,
  onForkMessage,
  onOpenSettings,
  suggestions,
}: ChatViewProps) {
  const inputRef = useRef<MessageInputHandle>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  // Auto-focus input when messages change
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages.length]);

  const handleSend: typeof onSend = async (message, attachments, mentionedTools, enableThinking) => {
    if (editingMessageId && onForkMessage) {
      await onForkMessage(editingMessageId);
      setEditingMessageId(null);
    }
    setEditingContent('');
    onSend(message, attachments, mentionedTools, enableThinking);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamStartTime={streamStartTime}
        onOpenSettings={onOpenSettings}
        onEditMessage={(id, content) => {
          setEditingContent(content);
          setEditingMessageId(id);
        }}
        onSuggestionSelect={(text) => onSend(text)}
        suggestions={suggestions}
      />
      <MessageInput
        ref={inputRef}
        sessionKey={sessionKey}
        onSend={handleSend}
        onStop={onStop}
        isStreaming={isStreaming}
        externalValue={editingContent}
        withContainer={false}
        thinkingEnabled={thinkingEnabled}
        onThinkingToggle={() => setThinkingEnabled(!thinkingEnabled)}
      />
      <div className="pb-3" />
    </div>
  );
}
