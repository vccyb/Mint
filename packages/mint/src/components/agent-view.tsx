'use client';

import {
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { PanelRight } from 'lucide-react';
import { MessageList } from './message-list';
import { MessageInput, type MessageInputHandle } from './message-input';
import { FilePanel } from './file-panel';
import { AskQuestionBanner } from './ask-question-banner';
import {
  RightPanel,
  RightPanelContext,
  type PanelState,
} from './right-panel';
import { TodoList } from './todo-list';
import type { ChatMessage, Attachment, PermissionRequestData, TodoItem } from '@/types';

interface AgentViewProps {
  messages: ChatMessage[];
  sessionKey?: string | null;
  isStreaming: boolean;
  streamStartTime?: number | null;
  onSend: (message: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  pendingPermission?: PermissionRequestData | null;
  onPermissionDecision?: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  concurrencyLimitReached?: boolean;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
  onPermissionModeChange?: (
    mode: 'bypassPermissions' | 'default' | 'plan',
  ) => void;
  onTogglePlanMode?: () => void;
  /** 当前会话是否关联了工程 */
  hasProject?: boolean;
  /** 当前选中的工程 ID */
  activeProjectId?: string | null;
}

export function AgentView({
  messages,
  sessionKey,
  isStreaming,
  streamStartTime,
  onSend,
  onStop,
  pendingPermission,
  onPermissionDecision,
  concurrencyLimitReached,
  onApprovePlan,
  permissionMode = 'default',
  onPermissionModeChange,
  onTogglePlanMode,
  hasProject = false,
  activeProjectId = null,
}: AgentViewProps) {
  const [panelState, setPanelState] = useState<PanelState>('visible');
  const [editingContent, setEditingContent] = useState<string>('');
  const inputRef = useRef<MessageInputHandle>(null);

  const ctxValue = useMemo(
    () => ({
      panelState,
      setPanelState,
    }),
    [panelState],
  );

  // Auto-focus input when messages change
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages.length]);

  const isFullscreen = panelState === 'fullscreen';

  const togglePanel = () => {
    if (panelState === 'hidden') {
      setPanelState('visible');
    } else {
      setPanelState('hidden');
    }
  };

  // Compute latest todos for pinned TodoList above input (Codex style)
  const latestTodoMsg = [...messages].reverse().find(
    (m) => m.role === 'assistant' && !m.isPlanMode && m.todos && m.todos.length > 0,
  );
  const latestTodos = latestTodoMsg?.todos;
  const hasActiveTodos = !!latestTodos && latestTodos.some((t: TodoItem) => t.status === 'in_progress');

  return (
    <RightPanelContext.Provider value={ctxValue}>
      <div className="flex flex-1 flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/80 bg-white/55 px-6 py-3 shrink-0 backdrop-blur">
          <div className="pill bg-primary-light text-primary-text">Agent</div>
          <span className="text-xs text-text-tertiary">
            具备读写文件与执行命令能力
          </span>
          <div className="flex-1" />
          {/* Panel toggle */}
          <button
            onClick={togglePanel}
            className={`flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors cursor-pointer ${
              panelState !== 'hidden'
                ? 'bg-[#E8F2FF] text-[#007AFF]'
                : 'text-[#AEAEB2] hover:text-[#6E6E73] hover:bg-bg-warm'
            }`}
            title={panelState === 'hidden' ? '打开侧栏' : '关闭侧栏'}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>

        {/* Body: Chat + Right Panel */}
        <div className="flex flex-1 min-h-0">
          {/* Chat area — hidden when panel is fullscreen */}
          {!isFullscreen && (
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                streamStartTime={streamStartTime}
                onEditMessage={(_id, content) =>
                  setEditingContent(content)
                }
                onApprovePlan={onApprovePlan}
                hideLastTodoAndPlan={hasActiveTodos}
              />
              {hasActiveTodos && !pendingPermission && (
                <div className="px-6 py-2">
                  <div className="mx-auto max-w-[640px]">
                    <TodoList todos={latestTodos!} pinned />
                  </div>
                </div>
              )}
              {pendingPermission && onPermissionDecision && (
                <div className="px-6 py-2">
                  <div className="mx-auto max-w-[640px]">
                    <AskQuestionBanner
                      request={pendingPermission}
                      onDecision={onPermissionDecision}
                      pinned
                    />
                  </div>
                </div>
              )}
              <div className={hasActiveTodos && !pendingPermission ? 'opacity-50 pointer-events-none' : ''}>
              <MessageInput
                ref={inputRef}
                sessionKey={sessionKey}
                onSend={onSend}
                onStop={onStop}
                isStreaming={isStreaming}
                placeholder="描述一个任务给 Agent 执行..."
                externalValue={editingContent}
                concurrencyLimitReached={concurrencyLimitReached}
                permissionMode={permissionMode}
                onPermissionModeChange={onPermissionModeChange}
                onTogglePlanMode={onTogglePlanMode}
                withContainer={false}
              />
              </div>
            </div>
          )}

          {/* Right Panel - Files only */}
          <RightPanel>
            <FilePanel
              fullscreen={isFullscreen}
              hasProject={hasProject}
              projectId={activeProjectId}
            />
          </RightPanel>
        </div>
      </div>
    </RightPanelContext.Provider>
  );
}
