'use client';

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { PanelRight } from 'lucide-react';
import { MessageList } from './message-list';
import { MessageInput, type MessageInputHandle } from './message-input';
import { FilePanel } from './file-panel';
import { FilePreviewPanel } from './file-preview';
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
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null);
  const [fileTreeWidth, setFileTreeWidth] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(480);
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

  const hasPreview = previewFile !== null;

  const togglePanel = () => {
    if (panelState === 'hidden') {
      setPanelState('visible');
    } else {
      setPanelState('hidden');
      setPreviewFile(null);
    }
  };

  const handleFileClick = (path: string, name: string) => {
    setPreviewFile({ path, name });
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = fileTreeWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        setFileTreeWidth(Math.min(400, Math.max(150, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [fileTreeWidth],
  );

  const handlePreviewResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = previewWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX; // 向左拖 = 预览变宽
        setPreviewWidth(Math.min(800, Math.max(200, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [previewWidth],
  );

  // Close preview when session changes
  useEffect(() => {
    setPreviewFile(null);
  }, [sessionKey]);

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

        {/* Body: Chat + File Panel + Preview Panel */}
        <div className="flex flex-1 min-h-0">
          {/* Chat area */}
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

          {/* Resize handle between chat and file tree */}
          {panelState !== 'hidden' && (
            <div
              onMouseDown={handleResizeMouseDown}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/20 transition-colors"
            />
          )}

          {/* Right Panel - File tree */}
          <RightPanel width={`${fileTreeWidth}px`}>
            <FilePanel
              hasProject={hasProject}
              projectId={activeProjectId}
              selectedFile={previewFile?.path}
              onFileClick={handleFileClick}
            />
          </RightPanel>

          {/* Resize handle between file tree and preview */}
          {hasPreview && (
            <div
              onMouseDown={handlePreviewResize}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/20 transition-colors"
            />
          )}

          {/* Preview Panel - 3rd column */}
          {hasPreview && (
            <div
              className="shrink-0 flex flex-col min-h-0 border-l border-border overflow-hidden"
              style={{ width: `${previewWidth}px` }}
            >
              <FilePreviewPanel
                filePath={previewFile.path}
                fileName={previewFile.name}
                projectId={activeProjectId}
                onClose={handleClosePreview}
              />
            </div>
          )}
        </div>
      </div>
    </RightPanelContext.Provider>
  );
}
