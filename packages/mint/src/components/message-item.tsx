'use client';

import { MessageCircleQuestion, CheckCircle2, FileText, Image as ImageIcon, File, Zap, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './markdown-renderer';
import { ThinkingBlock } from './thinking-block';
import { ErrorBlock } from './error-block';
import { ActivityPanel } from './activity-panel';
import { PlanCard } from './plan-card';
import { TodoList } from './todo-list';
import { MessageActions } from './message-actions';
import { AgentMessageItem } from './team/agent-message-item';
import { formatMessageTime } from '@/lib/format-time';
import type { ChatMessage } from '@/types';

/** Mint sparkle SVG avatar icon */
function MintAvatar() {
  return (
    <div className="w-6 h-6 rounded-md bg-[#F5F5F7] text-[#6E6E73] flex items-center justify-center shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 3-1.9 5.7a2 2 0 0 1-1.3 1.3L3 12l5.7 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.7a2 2 0 0 1 1.3-1.3L21 12l-5.7-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    </div>
  );
}

/** Parse mentions and render as styled chips (light mode for dark bg) */
function renderUserContent(content: string) {
  const parts = content.split(/(@\{[^}]+\}|\/\{[^}]+\}|#\{[^}]+\})/g);
  return parts.map((part, i) => {
    const fileMatch = part.match(/^@\{(.+)\}$/);
    if (fileMatch) {
      const filePath = fileMatch[1];
      const fileName = filePath.split('/').pop() ?? filePath;
      return (
        <span key={i} className="inline-flex items-center gap-1 bg-white/20 rounded px-1.5 text-[11px] font-mono">
          <File className="h-3 w-3" />
          @{fileName}
        </span>
      );
    }
    const skillMatch = part.match(/^\/\{(.+)\}$/);
    if (skillMatch) {
      return (
        <span key={i} className="inline-flex items-center gap-1 bg-white/20 rounded px-1.5 text-[11px] font-mono">
          <Zap className="h-3 w-3" />
          /{skillMatch[1]}
        </span>
      );
    }
    const mcpMatch = part.match(/^#\{(.+)\}$/);
    if (mcpMatch) {
      return (
        <span key={i} className="inline-flex items-center gap-1 bg-white/20 rounded px-1.5 text-[11px] font-mono">
          <Wrench className="h-3 w-3" />
          #{mcpMatch[1]}
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
  hideTodoAndPlan?: boolean;
}

export function MessageItem({ message, onEditMessage, streamStartTime, isLastMessage, onApprovePlan, hideTodoAndPlan }: MessageItemProps) {
  if (message.role === 'question') {
    return (
      <div className="px-6 py-3">
        <div className="mx-auto max-w-3xl flex gap-3">
          <MintAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-[#1D1D1F]">Mint</span>
              <span className="text-xs text-text-tertiary">&middot;</span>
              <span className="text-xs text-text-tertiary">{formatMessageTime(message.timestamp)}</span>
            </div>
            <div className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                <MessageCircleQuestion className="h-3.5 w-3.5" />
                <span>Agent asked</span>
              </div>
              <p className="mt-1 text-xs text-warning whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.role === 'answer') {
    return (
      <div className="px-6 py-3">
        <div className="mx-auto max-w-3xl flex gap-3">
          <MintAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-[#1D1D1F]">Mint</span>
              <span className="text-xs text-text-tertiary">&middot;</span>
              <span className="text-xs text-text-tertiary">{formatMessageTime(message.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-success font-medium">You answered:</span>
              <span className="text-text-secondary">{message.content}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';
  const isAgentMessage = !isUser && !!message.agentId;

  // Team agent messages use a distinct avatar wrapper
  if (isAgentMessage) {
    return (
      <AgentMessageItem
        agentId={message.agentId!}
        agentName={message.agentName ?? 'Agent'}
        agentAvatar={message.agentAvatar ?? '#007AFF'}
        timestamp={message.timestamp}
      >
        <MarkdownRenderer content={message.content} />
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ActivityPanel
            toolCalls={message.toolCalls}
            skillLoads={message.skillLoads}
            isStreaming={message.isStreaming}
          />
        )}
      </AgentMessageItem>
    );
  }

  return (
    <div id={isUser ? `msg-${message.id}` : undefined} className="px-6 py-3">
      <div className={cn(
        'mx-auto max-w-3xl flex gap-3',
        isUser && 'flex-row-reverse',
      )}>
        {/* Avatar */}
        {isUser ? (
          <div className="w-6 h-6 rounded-md bg-[#E8F2FF] text-[#007AFF] text-xs font-semibold flex items-center justify-center shrink-0">
            U
          </div>
        ) : (
          <MintAvatar />
        )}

        {/* Content */}
        <div className={cn('flex-1 min-w-0 group relative', isUser && 'flex flex-col items-end')}>
          {/* Header row: name + timestamp */}
          <div className={cn(
            'flex items-center gap-1.5 mb-1',
            isUser && 'flex-row-reverse',
          )}>
            <span className={cn(
              'text-xs font-semibold',
              isUser ? 'text-[#0055B3]' : 'text-[#1D1D1F]',
            )}>
              {isUser ? 'You' : 'Mint'}
            </span>
            <span className="text-xs text-text-tertiary">&middot;</span>
            <span className="text-xs text-text-tertiary">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>

          {/* Message body */}
          {isUser ? (
            <div className="max-w-[460px]">
              <div className="bg-[#007AFF] text-white px-3.5 py-2.5 rounded-t-xl rounded-bl-xl rounded-br-sm text-sm leading-relaxed">
                {renderUserContent(message.content)}
              </div>
            </div>
          ) : (
            <>
              {message.thinkingContent && (
                <ThinkingBlock
                  content={message.thinkingContent}
                  isStreaming={message.isStreaming ?? false}
                  startTime={streamStartTime}
                />
              )}
              {message.errorInfo && (
                <ErrorBlock code={message.errorInfo.code} message={message.errorInfo.message} />
              )}
              {!message.isPlanMode && !message.errorInfo && (
                <div
                  className={cn(
                    'text-sm leading-relaxed text-[#1D1D1F]',
                    message.isStreaming && 'streaming-cursor',
                  )}
                >
                  <MarkdownRenderer content={message.content} />
                </div>
              )}
            </>
          )}

          {/* Attachments */}
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

          {/* Todo list */}
          {!isUser && !message.isPlanMode && message.todos && message.todos.length > 0 && !hideTodoAndPlan && (
            <TodoList todos={message.todos} />
          )}

          {/* Plan card */}
          {!isUser && message.isPlanMode && !hideTodoAndPlan && (
            <PlanCard
              content={message.content}
              todos={message.todos ?? []}
              isLastMessage={isLastMessage ?? false}
              isStreaming={message.isStreaming ?? false}
              onApprove={onApprovePlan ?? (() => {})}
            />
          )}

          {/* Activity panel */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <ActivityPanel
              toolCalls={message.toolCalls}
              skillLoads={message.skillLoads}
              isStreaming={message.isStreaming}
            />
          )}

          {/* Message actions */}
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
