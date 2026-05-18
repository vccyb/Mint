'use client';

import {
  MessageCircleQuestion,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/file-icons';
import { MintAvatar, renderUserContent } from './message-content-renderer';
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

interface MessageItemProps {
  message: ChatMessage;
  onEditMessage?: (id: string, content: string) => void;
  streamStartTime?: number | null;
  isLastMessage?: boolean;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
  hideTodoAndPlan?: boolean;
  onFileClick?: (path: string) => void;
}

export function MessageItem({
  message,
  onEditMessage,
  streamStartTime,
  isLastMessage,
  onApprovePlan,
  hideTodoAndPlan,
  onFileClick,
}: MessageItemProps) {
  if (message.role === 'question') {
    return (
      <div className="px-6 py-3">
        <div className="mx-auto w-[80%] flex gap-3">
          <MintAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-foreground">Mint</span>
              <span className="text-xs text-text-tertiary">&middot;</span>
              <span className="text-xs text-text-tertiary">
                {formatMessageTime(message.timestamp)}
              </span>
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
        <div className="mx-auto w-[80%] flex gap-3">
          <MintAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-foreground">Mint</span>
              <span className="text-xs text-text-tertiary">&middot;</span>
              <span className="text-xs text-text-tertiary">
                {formatMessageTime(message.timestamp)}
              </span>
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
      <div className={cn('mx-auto w-[80%] flex gap-3', isUser && 'flex-row-reverse')}>
        {/* Avatar */}
        {isUser ? (
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
            U
          </div>
        ) : (
          <MintAvatar />
        )}

        {/* Content */}
        <div className={cn('flex-1 min-w-0', isUser && 'flex flex-col items-end')}>
          {/* Header row: name + timestamp */}
          <div className={cn('flex items-center gap-1.5 mb-1', isUser && 'flex-row-reverse')}>
            <span
              className={cn('text-xs font-semibold', isUser ? 'text-foreground' : 'text-foreground')}
            >
              {isUser ? 'You' : 'Mint'}
            </span>
            <span className="text-xs text-text-tertiary/60">&middot;</span>
            <span className="text-xs text-text-tertiary/60">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>

          {/* Message body */}
          {isUser ? (
            <div className="max-w-[460px]">
              <div className="bg-primary/[0.06] text-foreground px-3.5 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
                {renderUserContent(message.content, onFileClick)}
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
                    'pl-3 border-l-2 border-l-primary/10 text-sm leading-relaxed text-foreground',
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
              {message.attachments.map((att) => {
                const fileName = att.name.split('/').pop() ?? att.name;
                const { Icon, color } = getFileIcon(fileName);
                return (
                  <div
                    key={att.id}
                    role="button"
                    tabIndex={0}
                    title={att.name}
                    onClick={() => onFileClick?.(att.name)}
                    onKeyDown={(e) => e.key === 'Enter' && onFileClick?.(att.name)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card
                      px-2 py-1 text-xs text-text-secondary cursor-pointer hover:bg-bg-hover transition-colors"
                  >
                    <Icon className={cn('h-3 w-3 shrink-0', color)} />
                    <span className="max-w-[150px] truncate">{fileName}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Todo list */}
          {!isUser &&
            !message.isPlanMode &&
            message.todos &&
            message.todos.length > 0 &&
            !hideTodoAndPlan && <TodoList todos={message.todos} />}

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
            onEdit={
              isUser && onEditMessage ? () => onEditMessage(message.id, message.content) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
