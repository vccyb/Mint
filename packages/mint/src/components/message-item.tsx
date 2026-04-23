'use client';

import { Sparkles, MessageCircleQuestion, CheckCircle2, FileText, Image as ImageIcon, File, Zap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { ThinkingBlock } from './thinking-block';
import { ErrorBlock } from './error-block';
import { ActivityPanel } from './activity-panel';
import { PlanCard } from './plan-card';
import { TodoList } from './todo-list';
import { MessageActions } from './message-actions';
import { formatMessageTime } from '@/lib/format-time';
import { MENTION_COLORS } from '@/types';
import type { ChatMessage, MentionType } from '@/types';

const MENTION_ICONS: Record<MentionType, typeof File> = {
  file: File,
  skill: Zap,
  mcp: Wrench,
};

/** Parse @{path}, /{skill}, #{tool} mentions in user messages and render as styled chips. */
function renderUserContent(content: string) {
  const parts = content.split(/(@\{[^}]+\}|\/\{[^}]+\}|#\{[^}]+\})/g);
  return parts.map((part, i) => {
    const fileMatch = part.match(/^@\{(.+)\}$/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const fileName = filePath.split('/').pop() ?? filePath;
      const colors = MENTION_COLORS.file;
      const Icon = MENTION_ICONS.file;
      return (
        <span key={i} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${colors.bg} ${colors.border} ${colors.text}`}>
          <Icon className="h-3 w-3" />
          {fileName}
        </span>
      );
    }
    const skillMatch = part.match(/^\/\{(.+)\}$/);
    if (skillMatch) {
      const colors = MENTION_COLORS.skill;
      const Icon = MENTION_ICONS.skill;
      return (
        <span key={i} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${colors.bg} ${colors.border} ${colors.text}`}>
          <Icon className="h-3 w-3" />
          {skillMatch[1]}
        </span>
      );
    }
    const mcpMatch = part.match(/^#\{(.+)\}$/);
    if (mcpMatch) {
      const colors = MENTION_COLORS.mcp;
      const Icon = MENTION_ICONS.mcp;
      return (
        <span key={i} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${colors.bg} ${colors.border} ${colors.text}`}>
          <Icon className="h-3 w-3" />
          {mcpMatch[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface MessageItemProps {
  message: ChatMessage;
  onEditMessage?: (id: string, content: string) => void;
  streamStartTime?: number | null;
  isLastMessage?: boolean;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
}

export function MessageItem({ message, onEditMessage, streamStartTime, isLastMessage, onApprovePlan }: MessageItemProps) {
  // Question message (AskUserQuestion from agent)
  if (message.role === 'question') {
    return (
      <div className="px-6 py-2">
        <div className="mx-auto max-w-3xl rounded-lg border border-amber-300/50 bg-amber-50/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <MessageCircleQuestion className="h-3.5 w-3.5" />
            <span>Agent asked</span>
            <span className="text-text-tertiary">&middot;</span>
            <span className="text-text-tertiary font-normal">{formatMessageTime(message.timestamp)}</span>
          </div>
          <p className="mt-1 text-xs text-amber-800 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Answer message (user's reply to AskUserQuestion)
  if (message.role === 'answer') {
    return (
      <div className="px-6 py-1">
        <div className="mx-auto max-w-3xl flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
          <span className="text-green-700 font-medium">You answered:</span>
          <span className="text-text-secondary">{message.content}</span>
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div id={isUser ? `msg-${message.id}` : undefined} className="px-6 py-3">
      <div className="mx-auto max-w-3xl flex gap-3">
        {/* Avatar */}
        {isUser ? (
          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0">
            U
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-bg-warm text-text-secondary flex items-center justify-center shrink-0">
            <Sparkles size={12} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 group relative">
          {/* Header row: name + timestamp */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-primary-text">
              {isUser ? 'You' : 'Assistant'}
            </span>
            <span className="text-xs text-text-tertiary">&middot;</span>
            <span className="text-xs text-text-tertiary">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>

          {/* Message body */}
          {isUser ? (
            <p className="text-sm leading-relaxed text-text whitespace-pre-wrap">
              {renderUserContent(message.content)}
            </p>
          ) : (
            <>
              {/* Thinking block — Extended Thinking content */}
              {message.thinkingContent && (
                <ThinkingBlock
                  content={message.thinkingContent}
                  isStreaming={message.isStreaming ?? false}
                  startTime={streamStartTime}
                />
              )}
              {/* Error block — classified error display */}
              {message.errorInfo && (
                <ErrorBlock code={message.errorInfo.code} message={message.errorInfo.message} />
              )}
              {/* Main content (hidden in plan mode or error state) */}
              {!message.isPlanMode && !message.errorInfo && (
                <div
                  className={cn(
                    'text-sm leading-relaxed',
                    message.isStreaming && 'streaming-cursor',
                  )}
                >
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
            </>
          )}

          {/* Attachments — user messages only */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-bg-warm px-2 py-1 text-xs text-text-secondary"
                >
                  {att.type.startsWith('image/') ? (
                    <ImageIcon className="h-3 w-3 shrink-0" />
                  ) : (
                    <FileText className="h-3 w-3 shrink-0" />
                  )}
                  <span className="max-w-[150px] truncate">{att.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Todo list — inline task tracking (non-plan mode) */}
          {!isUser && !message.isPlanMode && message.todos && message.todos.length > 0 && (
            <TodoList todos={message.todos} />
          )}

          {/* Plan card — plan mode messages */}
          {!isUser && message.isPlanMode && (
            <PlanCard
              content={message.content}
              todos={message.todos ?? []}
              isLastMessage={isLastMessage ?? false}
              isStreaming={message.isStreaming ?? false}
              onApprove={onApprovePlan ?? (() => {})}
            />
          )}

          {/* Activity panel — collapsible tool/skill activities */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <ActivityPanel
              toolCalls={message.toolCalls}
              skillLoads={message.skillLoads}
              isStreaming={message.isStreaming}
            />
          )}

          {/* Message actions — hover overlay */}
          <MessageActions
            content={message.content}
            isUser={isUser}
            onEdit={isUser && onEditMessage ? () => onEditMessage(message.id, message.content) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
