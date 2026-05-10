'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Settings, FolderOpen, ChevronDown, ChevronRight, Pin, PinOff, X, MoreHorizontal, Edit, Check } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ConfirmDialog } from './confirm-dialog';
import { ModeToggle } from './mode-toggle';
import { RenameDialog } from './rename-dialog';
import { NewProjectDialog } from './new-project-dialog';
import { useStreamStatuses } from '@/lib/streaming-registry';
import type { Project, SessionMetadata, Mode } from '@/types';

interface ProjectSidebarProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSessionInProject: (projectId: string) => void;
  onDeleteSession: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onOpenSettings: () => void;
  onProjectSelect?: (projectId: string | null) => void;
}

export function ProjectSidebar({
  mode,
  onModeChange,
  activeSessionId,
  onSelectSession,
  onNewSessionInProject,
  onDeleteSession,
  onTogglePin,
  onOpenSettings,
  onProjectSelect,
}: ProjectSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'session'; id: string } | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ type: 'project' | 'session'; id: string; name: string } | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const streamStatuses = useStreamStatuses();

  // 加载工程和会话
  const loadData = useCallback(async () => {
    try {
      const [projectsRes, sessionsRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/sessions?mode=agent'),
      ]);

      if (projectsRes.ok && sessionsRes.ok) {
        const projectsData = await projectsRes.json();
        const sessionsData = await sessionsRes.json();
        setProjects(projectsData.projects || []);
        setSessions(sessionsData || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, activeSessionId]);

  // Auto-expand all projects by default
  useEffect(() => {
    if (projects.length > 0) {
      setExpandedProjects(new Set(projects.map(p => p.id)));
    }
  }, [projects]);

  // 切换工程展开状态
  const toggleProjectExpanded = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  // 创建工程
  const handleCreateProject = useCallback(async (name: string, projectPath: string) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        projectPath: projectPath || undefined,
      }),
    });
    if (res.ok) {
      await loadData();
    } else {
      const error = await res.json();
      alert('创建工程失败: ' + (error.error || '未知错误'));
    }
  }, [loadData]);

  // 删除工程
  const handleDeleteProject = useCallback(
    async (projectId: string) => {
      try {
        await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 删除会话
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 置顶工程
  const handleToggleProjectPin = useCallback(
    async (projectId: string, pinned: boolean) => {
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned }),
        });
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 获取工程下的会话
  const getProjectSessions = (projectId: string): SessionMetadata[] => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return [];
    return sessions.filter((s) => project.sessionIds.includes(s.id));
  };

  // 选择工程
  const handleSelectProject = useCallback((projectId: string) => {
    onProjectSelect?.(projectId);
    toggleProjectExpanded(projectId);
  }, [onProjectSelect]);

  // 重命名工程
  const handleRenameProject = useCallback(async (projectId: string, newName: string) => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      await loadData();
    } catch {
      // ignore
    }
  }, [loadData]);

  return (
    <div className="flex h-full w-[200px] min-w-[200px] flex-col border-r border-border bg-bg-warm">
      <ModeToggle mode={mode} onModeChange={onModeChange} />
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[12px] font-semibold text-text-secondary">Agent 工程</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowNewProjectDialog(true)}
          aria-label="New project"
          title="添加工程"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 工程列表 */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1.5 pb-3 space-y-[1px]">
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const isHovered = hoveredProjectId === project.id;
            const projectSessions = getProjectSessions(project.id);

            return (
              <div key={project.id} className="relative group">
                {/* 工程行 */}
                <div
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-hover cursor-pointer transition-colors min-h-[28px]"
                  onClick={() => handleSelectProject(project.id)}
                  onMouseEnter={() => setHoveredProjectId(project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-text-tertiary shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-text-tertiary shrink-0" />
                  )}
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="flex-1 text-xs text-text truncate">{project.name}</span>

                  {/* 占位元素，防止抖动 */}
                  <div className="w-[60px] h-[20px] shrink-0 flex items-center justify-end gap-0.5">
                    {projectSessions.length > 0 && !isHovered && (
                      <span className="text-[10px] text-text-tertiary">{projectSessions.length}</span>
                    )}

                    {/* Hover 时显示的操作按钮 */}
                    {isHovered && (
                      <>
                        {/* 更多操作按钮 */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowProjectMenu(showProjectMenu === project.id ? null : project.id);
                            }}
                            className="p-1 hover:bg-bg-hover rounded"
                            title="更多操作"
                          >
                            <MoreHorizontal className="w-3 h-3 text-text-tertiary" />
                          </button>

                          {/* 下拉菜单 */}
                          {showProjectMenu === project.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowProjectMenu(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 bg-[#F5F5F7] backdrop-blur-sm border border-[rgba(0,0,0,0.08)] rounded-lg shadow-sm py-1 min-w-[140px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProjectMenu(null);
                                    setRenameTarget({ type: 'project', id: project.id, name: project.name });
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs text-text hover:bg-[#E8F2FF] hover:text-[#007AFF] transition-colors duration-150 flex items-center gap-2"
                                >
                                  <Edit className="w-3 h-3 opacity-60" />
                                  重命名
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowProjectMenu(null);
                                    setDeleteTarget({ type: 'project', id: project.id });
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs text-error hover:bg-[#FFE5E5] hover:text-[#FF3B30] transition-colors duration-150 flex items-center gap-2"
                                >
                                  <X className="w-3 h-3 opacity-60" />
                                  删除
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* 新增对话按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNewSessionInProject(project.id);
                          }}
                          className="p-1 hover:bg-bg-hover rounded"
                          title="新建对话"
                        >
                          <Plus className="w-3 h-3 text-text-tertiary" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 工程下的对话列表 */}
                {isExpanded && (
                  <div className="ml-4 pl-2 border-l border-border/40">
                    {projectSessions.length > 0 ? (
                      projectSessions.map((session) => (
                        <SessionItem
                          key={session.id}
                          session={session}
                          active={activeSessionId === session.id}
                          isStreaming={streamStatuses.get(session.id)?.isStreaming === true}
                          isCompleted={streamStatuses.has(session.id) && streamStatuses.get(session.id)?.isStreaming === false}
                          onClick={() => onSelectSession(session.id)}
                          onTogglePin={() => onTogglePin(session.id, !session.pinned)}
                          onDelete={() => setDeleteTarget({ type: 'session', id: session.id })}
                        />
                      ))
                    ) : (
                      <div className="px-2 py-1 text-xs text-text-tertiary truncate">
                        暂无对话
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="px-2 py-6 text-center text-[10px] text-text-tertiary">
              还没有工程
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-2">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] text-text-secondary transition-colors cursor-pointer hover:bg-bg-hover"
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          设置
        </button>
      </div>

      {/* 重命名对话框 */}
      {renameTarget && (
        <RenameDialog
          open={true}
          title={renameTarget.type === 'project' ? '重命名工程' : '重命名对话'}
          initialName={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onConfirm={async (newName) => {
            if (renameTarget.type === 'project') {
              await handleRenameProject(renameTarget.id, newName);
            }
            setRenameTarget(null);
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteTarget && (
        <ConfirmDialog
          open={true}
          title={deleteTarget.type === 'project' ? '删除工程' : '删除对话'}
          message={deleteTarget.type === 'project' ? '确定要删除此工程吗？工程下的所有对话也将被删除。' : '确定要删除此对话吗？'}
          confirmLabel="删除"
          cancelLabel="取消"
          variant="danger"
          onConfirm={async () => {
            if (deleteTarget.type === 'project') {
              await handleDeleteProject(deleteTarget.id);
            } else {
              await handleDeleteSession(deleteTarget.id);
            }
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* 新建工程对话框 */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        onConfirm={handleCreateProject}
      />
    </div>
  );
}

/** 会话列表项 */
interface SessionItemProps {
  session: SessionMetadata;
  active: boolean;
  isStreaming?: boolean;
  isCompleted?: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

function SessionItem({ session, active, isStreaming, isCompleted, onClick, onTogglePin, onDelete }: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors relative group ${
        active ? 'bg-[#E8F2FF] text-[#007AFF]' : 'hover:bg-bg-hover'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Streaming spinner or completed check */}
      {isStreaming && <div className="spinner-dot shrink-0" />}
      {isCompleted && !isStreaming && <Check className="w-3 h-3 text-success shrink-0" />}
      {/* Title */}
      <span className="flex-1 text-xs truncate">
        {session.title}
      </span>
      {isStreaming && <span className="text-[10px] text-primary shrink-0">运行中</span>}
      {isCompleted && !isStreaming && <span className="text-[10px] text-success shrink-0">已完成</span>}
      {session.pinned && <Pin className="w-3 h-3 text-yellow-500 shrink-0" />}

      {/* Hover 时显示的操作按钮 */}
      {isHovered && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-bg border border-border rounded shadow-sm px-1 py-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className="p-1 hover:bg-bg-hover rounded"
          >
            {session.pinned ? (
              <PinOff className="w-3 h-3 text-text-tertiary" />
            ) : (
              <Pin className="w-3 h-3 text-text-tertiary" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-bg-hover rounded"
          >
            <X className="w-3 h-3 text-text-tertiary" />
          </button>
        </div>
      )}
    </div>
  );
}
