
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PanelRight, Users, Zap, Terminal } from 'lucide-react';
import { MessageList } from '../message-list';
import { MessageInput, type MessageInputHandle } from '../message-input';
import { FilePanel } from '../file-panel';
import { FilePreviewPanel } from '../file-preview';
import { AskQuestionBanner } from '../ask-question-banner';
import { TeamDrawer } from '../team/team-drawer';
import { TeamDetailOverlay } from '../team/team-detail-overlay';
import { RightPanel, RightPanelContext, type PanelState } from '../right-panel';
import { TodoList } from '../todo-list';
import { TerminalPanel } from '../terminal-panel';
import { useResizePanels } from './use-resize-panels';
import { generateId } from '@/lib/utils';
import type {
  ChatMessage,
  Attachment,
  PermissionRequestData,
  TodoItem,
  TeammateState,
  SessionFile,
} from '@/types';

interface AgentViewProps {
  messages: ChatMessage[];
  sessionKey?: string | null;
  isStreaming: boolean;
  streamStartTime?: number | null;
  onSend: (message: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  onForkMessage?: (messageId: string) => Promise<void>;
  pendingPermission?: PermissionRequestData | null;
  onPermissionDecision?: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  concurrencyLimitReached?: boolean;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
  onPermissionModeChange?: (mode: 'bypassPermissions' | 'default' | 'plan') => void;
  onTogglePlanMode?: () => void;
  /** 当前会话是否关联了工程 */
  hasProject?: boolean;
  /** 当前选中的工程 ID */
  activeProjectId?: string | null;
  /** Agent teammates 状态列表 */
  teammates?: TeammateState[];
  /** 是否正在等待 resume */
  isWaitingResume?: boolean;
  /** Token usage (input tokens) */
  tokenUsage?: number;
  /** Token budget (context window) */
  tokenBudget?: number;
  /** Whether context is being compacted */
  isCompacting?: boolean;
  onOpenSettings?: () => void;
  suggestions?: string[];
}

export function AgentView({
  messages,
  sessionKey,
  isStreaming,
  streamStartTime,
  onSend,
  onStop,
  onForkMessage,
  pendingPermission,
  onPermissionDecision,
  concurrencyLimitReached,
  onApprovePlan,
  permissionMode = 'default',
  onPermissionModeChange,
  onTogglePlanMode,
  hasProject = false,
  activeProjectId = null,
  teammates,
  isWaitingResume,
  tokenUsage,
  tokenBudget,
  isCompacting,
  onOpenSettings,
  suggestions,
}: AgentViewProps) {
  const [panelState, setPanelState] = useState<PanelState>('visible');
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    path: string;
    name: string;
    isSessionFile?: boolean;
    sessionId?: string;
  } | null>(null);
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [teamPanelFullscreen, setTeamPanelFullscreen] = useState(false);
  const [selectedTeammateId, setSelectedTeammateId] = useState<string | null>(null);
  const [dismissedTodos, setDismissedTodos] = useState(false);
  const [sessionFilesRefreshKey, setSessionFilesRefreshKey] = useState(0);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalIds, setTerminalIds] = useState<string[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string | undefined>(undefined);
  const inputRef = useRef<MessageInputHandle>(null);
  const { fileTreeWidth, previewWidth, terminalHeight, handleResizeMouseDown, handlePreviewResize, handleTerminalResize } =
    useResizePanels();

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

  // Refresh session files panel when streaming ends (attachments have been synced by then)
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      setSessionFilesRefreshKey((k) => k + 1);
    }
  }, [isStreaming]);

  // Resolve project path for terminal cwd
  useEffect(() => {
    if (!activeProjectId) {
      setProjectPath(undefined);
      return;
    }
    const api = (window as any).electronAPI;
    api?.listProjects().then((projects: Array<{ id: string; projectPath?: string }>) => {
      const proj = projects.find((p) => p.id === activeProjectId);
      setProjectPath(proj?.projectPath);
    }).catch(() => setProjectPath(undefined));
  }, [activeProjectId]);
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

  // Terminal management
  const handleToggleTerminal = useCallback(() => {
    if (terminalVisible) {
      // Close panel — kill all PTYs
      const api = (window as any).electronAPI;
      for (const id of terminalIds) {
        api?.terminalKill(id);
      }
      setTerminalVisible(false);
      setTerminalIds([]);
      setActiveTerminalId('');
    } else {
      // Open panel with one terminal
      const newId = `term_${generateId()}`;
      setTerminalIds([newId]);
      setActiveTerminalId(newId);
      setTerminalVisible(true);
    }
  }, [terminalVisible, terminalIds]);

  const handleAddTerminal = useCallback(() => {
    const newId = `term_${generateId()}`;
    setTerminalIds((prev) => [...prev, newId]);
    setActiveTerminalId(newId);
  }, []);

  const handleCloseTerminal = useCallback((id: string) => {
    const api = (window as any).electronAPI;
    api?.terminalKill(id);
    setTerminalIds((prev) => {
      const next = prev.filter((t) => t !== id);
      if (next.length === 0) {
        setTerminalVisible(false);
        setActiveTerminalId('');
      } else {
        setActiveTerminalId(next[next.length - 1]);
      }
      return next;
    });
  }, []);

  const handleCloseTerminalPanel = useCallback(() => {
    const api = (window as any).electronAPI;
    for (const id of terminalIds) {
      api?.terminalKill(id);
    }
    setTerminalVisible(false);
    setTerminalIds([]);
    setActiveTerminalId('');
  }, [terminalIds]);
  // Close preview when session changes
  useEffect(() => {
    setPreviewFile(null);
    setDismissedTodos(false);
  }, [sessionKey]);
  // Compute latest todos for pinned TodoList above input (Codex style)
  const latestTodoMsg = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant' && !m.isPlanMode && m.todos && m.todos.length > 0);
  const latestTodos = latestTodoMsg?.todos;
  const hasActiveTodos =
    !!latestTodos && latestTodos.some((t: TodoItem) => t.status === 'in_progress');

  const handleAgentSend: typeof onSend = async (message, attachments) => {
    if (editingMessageId && onForkMessage) {
      await onForkMessage(editingMessageId);
      setEditingMessageId(null);
    }
    setEditingContent('');
    onSend(message, attachments);
  };

  return (
    <RightPanelContext.Provider value={ctxValue}>
      <div className="relative flex flex-1 flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/80 bg-card/55 px-6 py-3 shrink-0 backdrop-blur">
          <div className="pill bg-primary-light text-primary-text">Agent</div>
          <span className="text-xs text-text-tertiary">具备读写文件与执行命令能力</span>
          <div className="flex-1" />
          {/* Context usage badge */}
          {tokenUsage !== undefined && tokenBudget !== undefined && tokenUsage > 0 && (
            <button
              onClick={() => {
                if (isStreaming && !isCompacting) return;
                // Send /compact command via the input
                onSend('/compact');
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                isCompacting
                  ? 'text-warning animate-pulse'
                  : tokenUsage / tokenBudget > 0.775
                    ? 'text-destructive hover:bg-red-50'
                    : 'text-text-tertiary hover:text-muted-foreground hover:bg-bg-warm'
              }`}
              title={
                isCompacting
                  ? 'Compacting context...'
                  : `Context: ${tokenUsage.toLocaleString()} / ${(tokenBudget / 1000).toFixed(0)}K tokens`
              }
            >
              <Zap className="h-3 w-3" />
              {isCompacting
                ? 'Compressing...'
                : `${Math.round((tokenUsage / tokenBudget) * 100)}%`}
            </button>
          )}
          {/* Teams button */}
          <button
            onClick={() => {
              setTeamPanelOpen(!teamPanelOpen);
              setTeamPanelFullscreen(false);
            }}
            className={`relative flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors cursor-pointer ${
              teamPanelOpen
                ? 'bg-primary-light text-primary'
                : teammates && teammates.length > 0
                  ? 'text-primary'
                  : 'text-text-tertiary hover:text-muted-foreground hover:bg-bg-warm'
            }`}
            title="Agent Teams"
          >
            <Users className="h-4 w-4" />
            {teammates && teammates.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {teammates.length}
              </span>
            )}
          </button>
          {/* Terminal toggle */}
          <button
            onClick={handleToggleTerminal}
            className={`flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors cursor-pointer ${
              terminalVisible
                ? 'bg-primary-light text-primary'
                : 'text-text-tertiary hover:text-muted-foreground hover:bg-bg-warm'
            }`}
            title={terminalVisible ? '关闭终端' : '打开终端'}
          >
            <Terminal className="h-4 w-4" />
          </button>
          {/* Panel toggle */}
          <button
            onClick={togglePanel}
            className={`flex items-center justify-center w-[28px] h-[28px] rounded-[6px] transition-colors cursor-pointer ${
              panelState !== 'hidden'
                ? 'bg-primary-light text-primary'
                : 'text-text-tertiary hover:text-muted-foreground hover:bg-bg-warm'
            }`}
            title={panelState === 'hidden' ? '打开侧栏' : '关闭侧栏'}
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>
        {/* Body: vertical split (panels + optional terminal) */}
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Top row: Chat + File Panel + Preview Panel */}
          <div className="flex flex-1 min-h-0">
            {/* Chat area */}
            <div className="flex flex-col flex-1 min-h-0 min-w-0">
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                streamStartTime={streamStartTime}
                onOpenSettings={onOpenSettings}
                onEditMessage={(id, content) => {
                  setEditingContent(content);
                  setEditingMessageId(id);
                }}
                onApprovePlan={onApprovePlan}
                hideLastTodoAndPlan={hasActiveTodos}
                teammates={teammates}
                isWaitingResume={isWaitingResume}
                onViewTeam={() => {
                  setTeamPanelOpen(true);
                  setTeamPanelFullscreen(false);
                }}
                onFileClick={(path) => {
                  const name = path.split('/').pop() ?? path;
                  handleFileClick(path, name);
                }}
                onSuggestionSelect={(text) => onSend(text)}
                suggestions={suggestions}
              />
              {hasActiveTodos && !pendingPermission && !dismissedTodos && (
                <div className="px-6 py-2">
                  <div className="mx-auto max-w-[640px]">
                    <TodoList
                      todos={latestTodos!}
                      pinned
                      onDismiss={() => setDismissedTodos(true)}
                      teamCount={teammates?.filter((t) => t.status === 'running').length}
                    />
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
              <div className="pb-3">
                <MessageInput
                  ref={inputRef}
                  sessionKey={sessionKey}
                  onSend={handleAgentSend}
                  onStop={onStop}
                  isStreaming={isStreaming}
                  placeholder="描述一个任务给 Agent 执行..."
                  externalValue={editingContent}
                  concurrencyLimitReached={concurrencyLimitReached}
                  permissionMode={permissionMode}
                  onPermissionModeChange={onPermissionModeChange}
                  onTogglePlanMode={onTogglePlanMode}
                  withContainer={false}
                  inputDisabled={hasActiveTodos && !pendingPermission}
                  mode="agent"
                  projectId={activeProjectId}
                  tokenUsage={tokenUsage}
                  tokenBudget={tokenBudget}
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
                sessionId={sessionKey}
                onSessionFileClick={(file: SessionFile) => {
                  setPreviewFile({
                    path: file.id,
                    name: file.name,
                    isSessionFile: true,
                    sessionId: sessionKey ?? undefined,
                  });
                }}
                sessionFilesRefreshKey={sessionFilesRefreshKey}
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
                  sessionFileId={previewFile.isSessionFile ? previewFile.path : undefined}
                  sessionId={previewFile.isSessionFile ? previewFile.sessionId : undefined}
                />
              </div>
            )}

            {/* Team Drawer */}
            {teamPanelOpen && !teamPanelFullscreen && (
              <TeamDrawer
                teammates={teammates ?? []}
                isWaitingResume={isWaitingResume ?? false}
                onExpand={(taskId) => {
                  setSelectedTeammateId(taskId ?? null);
                  setTeamPanelFullscreen(true);
                }}
                onClose={() => setTeamPanelOpen(false)}
              />
            )}

            {/* Team Detail Overlay */}
            {teamPanelOpen && teamPanelFullscreen && (
              <TeamDetailOverlay
                teammates={teammates ?? []}
                isWaitingResume={isWaitingResume ?? false}
                initialSelectedId={selectedTeammateId}
                onClose={() => {
                  setTeamPanelOpen(false);
                  setTeamPanelFullscreen(false);
                  setSelectedTeammateId(null);
                }}
              />
            )}
          </div>

          {/* Vertical resize handle for terminal */}
          {terminalVisible && (
            <div
              onMouseDown={handleTerminalResize}
              className="h-1 shrink-0 cursor-row-resize bg-border hover:bg-primary/20 transition-colors"
            />
          )}

          {/* Terminal Panel */}
          {terminalVisible && terminalIds.length > 0 && (
            <div
              className="shrink-0 border-t border-border overflow-hidden"
              style={{ height: `${terminalHeight}px` }}
            >
              <TerminalPanel
                terminals={terminalIds}
                activeTerminalId={activeTerminalId}
                onSelectTerminal={setActiveTerminalId}
                onAddTerminal={handleAddTerminal}
                onCloseTerminal={handleCloseTerminal}
                onClosePanel={handleCloseTerminalPanel}
                cwd={projectPath}
              />
            </div>
          )}
        </div>
      </div>
    </RightPanelContext.Provider>
  );
}
