
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStreamStatuses } from '@/lib/streaming-registry';
import type { Project, SessionMetadata } from '@/types';

export function useProjectData(sessions: SessionMetadata[]) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const streamStatuses = useStreamStatuses();
  const [unvisitedCompleted, setUnvisitedCompleted] = useState<Set<string>>(new Set());
  const prevStreamingIds = useRef<Set<string>>(new Set());

  // 追踪 streaming→completed 过渡，只在刚完成时显示 "已完成"
  useEffect(() => {
    const currentIds = new Set<string>();
    for (const [id, status] of streamStatuses) {
      if (status.isStreaming) currentIds.add(id);
    }
    for (const id of prevStreamingIds.current) {
      if (!currentIds.has(id)) setUnvisitedCompleted((p) => new Set(p).add(id));
    }
    prevStreamingIds.current = currentIds;
  }, [streamStatuses]);

  // 30s 后自动清除 "已完成" 标识
  useEffect(() => {
    if (unvisitedCompleted.size === 0) return;
    const timer = setTimeout(() => setUnvisitedCompleted(new Set()), 30_000);
    return () => clearTimeout(timer);
  }, [unvisitedCompleted]);

  // 加载工程列表
  const loadData = useCallback(async () => {
    const api = (window as any).electronAPI;
    try {
      const data = await api.listProjects();
      setProjects(Array.isArray(data) ? data : (data.projects || []));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-expand all projects by default
  useEffect(() => {
    if (projects.length > 0) {
      setExpandedProjects(new Set(projects.map((p) => p.id)));
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
  const createProject = useCallback(
    async (name: string, projectPath: string) => {
      const api = (window as any).electronAPI;
      try {
        await api.createProject({ name, projectPath: projectPath || undefined });
        await loadData();
      } catch (error: any) {
        alert('创建工程失败: ' + (error?.message || '未知错误'));
      }
    },
    [loadData],
  );

  // 删除工程
  const deleteProject = useCallback(
    async (projectId: string) => {
      const api = (window as any).electronAPI;
      try {
        await api.deleteProject(projectId);
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 删除会话
  const deleteSession = useCallback(
    async (sessionId: string) => {
      const api = (window as any).electronAPI;
      try {
        await api.deleteSession(sessionId);
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 置顶工程
  const toggleProjectPin = useCallback(
    async (projectId: string, pinned: boolean) => {
      const api = (window as any).electronAPI;
      try {
        await api.updateProject(projectId, { pinned });
        await loadData();
      } catch {
        // ignore
      }
    },
    [loadData],
  );

  // 重命名工程
  const renameProject = useCallback(
    async (projectId: string, newName: string) => {
      const api = (window as any).electronAPI;
      try {
        await api.updateProject(projectId, { name: newName });
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

  const clearUnvisitedSession = (sessionId: string) => {
    setUnvisitedCompleted((p) => {
      const n = new Set(p);
      n.delete(sessionId);
      return n;
    });
  };

  return {
    projects,
    expandedProjects,
    streamStatuses,
    unvisitedCompleted,
    toggleProjectExpanded,
    createProject,
    deleteProject,
    deleteSession,
    toggleProjectPin,
    renameProject,
    getProjectSessions,
    clearUnvisitedSession,
  };
}
