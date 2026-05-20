'use client';

import { useState, useCallback } from 'react';
import { Plus, Settings } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ConfirmDialog } from '../confirm-dialog';
import { ModeToggle } from '../mode-toggle';
import { RenameDialog } from '../rename-dialog';
import { NewProjectDialog } from '../new-project-dialog';
import type { SessionMetadata, Mode } from '@/types';
import { SessionItem } from './session-item';
import { ProjectRow } from './project-menu';
import { useProjectData } from './use-project-data';

interface ProjectSidebarProps {
  mode: Mode;
  sessions: SessionMetadata[];
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
  sessions,
  onModeChange,
  activeSessionId,
  onSelectSession,
  onNewSessionInProject,
  onTogglePin,
  onOpenSettings,
  onProjectSelect,
}: ProjectSidebarProps) {
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'project' | 'session';
    id: string;
  } | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{
    type: 'project' | 'session';
    id: string;
    name: string;
  } | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const {
    projects,
    expandedProjects,
    streamStatuses,
    unvisitedCompleted,
    toggleProjectExpanded,
    createProject,
    deleteProject,
    deleteSession,
    renameProject,
    getProjectSessions,
    clearUnvisitedSession,
  } = useProjectData(sessions);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      onProjectSelect?.(projectId);
      toggleProjectExpanded(projectId);
    },
    [onProjectSelect, toggleProjectExpanded],
  );

  return (
    <div className="flex h-full w-[240px] min-w-[240px] flex-col border-r border-border bg-bg-warm">
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
                <ProjectRow
                  project={project}
                  isExpanded={isExpanded}
                  isHovered={isHovered}
                  showMenu={showProjectMenu === project.id}
                  sessionCount={projectSessions.length}
                  onSelect={() => handleSelectProject(project.id)}
                  onHoverChange={(hovered) => setHoveredProjectId(hovered ? project.id : null)}
                  onToggleMenu={() =>
                    setShowProjectMenu(showProjectMenu === project.id ? null : project.id)
                  }
                  onRename={() => {
                    setShowProjectMenu(null);
                    setRenameTarget({
                      type: 'project',
                      id: project.id,
                      name: project.name,
                    });
                  }}
                  onDelete={() => {
                    setShowProjectMenu(null);
                    setDeleteTarget({ type: 'project', id: project.id });
                  }}
                  onNewSession={() => onNewSessionInProject(project.id)}
                />

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
                          isCompleted={unvisitedCompleted.has(session.id)}
                          onClick={() => {
                            clearUnvisitedSession(session.id);
                            onSelectSession(session.id);
                          }}
                          onTogglePin={() => onTogglePin(session.id, !session.pinned)}
                          onDelete={() => setDeleteTarget({ type: 'session', id: session.id })}
                        />
                      ))
                    ) : (
                      <div className="px-2 py-1 text-xs text-text-tertiary truncate">暂无对话</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="px-2 py-6 text-center text-[10px] text-text-tertiary">还没有工程</div>
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
              await renameProject(renameTarget.id, newName);
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
          message={
            deleteTarget.type === 'project'
              ? '确定要删除此工程吗？工程下的所有对话也将被删除。'
              : '确定要删除此对话吗？'
          }
          confirmLabel="删除"
          cancelLabel="取消"
          variant="danger"
          onConfirm={async () => {
            if (deleteTarget.type === 'project') {
              await deleteProject(deleteTarget.id);
            } else {
              await deleteSession(deleteTarget.id);
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
        onConfirm={createProject}
      />
    </div>
  );
}
