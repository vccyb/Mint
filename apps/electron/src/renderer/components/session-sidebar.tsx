
import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Settings, FolderPlus } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ModeToggle } from './mode-toggle';
import { SessionRow } from './session-row';
import { GroupHeader } from './group-header';
import { SessionSearch } from './session-search';
import { ConfirmDialog } from './confirm-dialog';
import { useStreamStatuses } from '@/lib/streaming-registry';
import type { Mode, SessionMetadata, SessionGroup } from '@/types';

interface SessionSidebarProps {
  mode: Mode;
  sessions: SessionMetadata[];
  onModeChange: (mode: Mode) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onOpenSettings: () => void;
}

export function SessionSidebar({
  mode,
  sessions,
  onModeChange,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePin,
  onOpenSettings,
}: SessionSidebarProps) {
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const streamStatuses = useStreamStatuses();
  const [unvisitedCompleted, setUnvisitedCompleted] = useState<Set<string>>(new Set());
  const prevStreamingIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mode !== 'agent') {
      prevStreamingIds.current = new Set();
      return;
    }
    const currentIds = new Set<string>();
    for (const [id, status] of streamStatuses) {
      if (status.isStreaming) currentIds.add(id);
    }
    for (const id of prevStreamingIds.current) {
      if (!currentIds.has(id)) setUnvisitedCompleted((p) => new Set(p).add(id));
    }
    prevStreamingIds.current = currentIds;
  }, [mode, streamStatuses]);

  // 30s 后自动清除 "已完成" 标识
  useEffect(() => {
    if (unvisitedCompleted.size === 0) return;
    const timer = setTimeout(() => setUnvisitedCompleted(new Set()), 30_000);
    return () => clearTimeout(timer);
  }, [unvisitedCompleted]);

  const handleSelect = useCallback(
    (id: string) => {
      setUnvisitedCompleted((p) => {
        if (!p.has(id)) return p;
        const n = new Set(p);
        n.delete(id);
        return n;
      });
      onSelectSession(id);
    },
    [onSelectSession],
  );

  const loadGroups = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (mode !== 'agent') return;
    try {
      const data = await api.listGroups();
      setGroups(data);
    } catch {
      /* ignore */
    }
  }, [mode]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = useCallback(async () => {
    const api = (window as any).electronAPI;
    const data = await api.createGroup({ name: `分组 ${groups.length + 1}` });
    setGroups((p) => [...p, data]);
  }, [groups.length]);

  const handleRenameGroup = useCallback(async (gid: string, name: string) => {
    const api = (window as any).electronAPI;
    await api.updateGroup(gid, { name });
    setGroups((p) => p.map((g) => (g.id === gid ? { ...g, name } : g)));
  }, []);

  const handleDeleteGroup = useCallback(async (gid: string) => {
    const api = (window as any).electronAPI;
    await api.deleteGroup(gid);
    setGroups((p) => p.filter((g) => g.id !== gid));
  }, []);

  const patchGroup = useCallback(
    async (gid: string | null, body: object) => {
      const api = (window as any).electronAPI;
      if (gid) {
        await api.updateGroup(gid, body);
      } else {
        await api.updateGroup('ungroup', body);
      }
      loadGroups();
    },
    [loadGroups],
  );

  const handleDragStart = useCallback((_e: React.DragEvent, sid: string) => {
    _e.dataTransfer.setData('text/plain', sid);
    _e.dataTransfer.effectAllowed = 'move';
  }, []);

  const toggleGroup = useCallback((gid: string) => {
    setCollapsedGroups((p) => {
      const n = new Set(p);
      n.has(gid) ? n.delete(gid) : n.add(gid);
      return n;
    });
  }, []);

  const filtered = searchQuery
    ? sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions;
  const groupedIds = new Set(groups.flatMap((g) => g.sessionIds));

  const rowProps = (s: SessionMetadata, extra?: { indent?: boolean }) => ({
    session: s,
    mode,
    isActive: activeSessionId === s.id,
    streamStatus: streamStatuses.get(s.id),
    isCompletedUnvisited: unvisitedCompleted.has(s.id),
    onSelect: handleSelect,
    onDelete: setDeleteTarget,
    onTogglePin,
    onDragStart: handleDragStart,
    groups,
    onMoveToGroup: (sid: string, gid: string | null) => {
      if (gid) patchGroup(gid, { sessionId: sid });
      else patchGroup(null, { sessionId: sid });
    },
    ...extra,
  });

  const renderAgentTree = () => {
    const pinned = filtered.filter((s) => s.pinned);
    const ungrouped = filtered.filter((s) => !s.pinned && !groupedIds.has(s.id));
    return (
      <>
        {pinned.map((s) => (
          <SessionRow key={s.id} {...rowProps(s)} />
        ))}
        {pinned.length > 0 && (groups.length > 0 || ungrouped.length > 0) && (
          <div className="my-1 mx-2 border-t border-border" />
        )}
        {groups.map((g) => {
          const gs = g.sessionIds
            .map((sid) => filtered.find((s) => s.id === sid))
            .filter(Boolean) as SessionMetadata[];
          return (
            <div key={g.id}>
              <GroupHeader
                group={g}
                isCollapsed={collapsedGroups.has(g.id)}
                onToggle={() => toggleGroup(g.id)}
                onRename={(n) => handleRenameGroup(g.id, n)}
                onDelete={() => handleDeleteGroup(g.id)}
                onDrop={(sid) => patchGroup(g.id, { sessionId: sid })}
              />
              {!collapsedGroups.has(g.id) &&
                gs.map((s) => <SessionRow key={s.id} {...rowProps(s, { indent: true })} />)}
            </div>
          );
        })}
        {ungrouped.length > 0 && groups.length > 0 && (
          <>
            <div className="my-1 mx-2 border-t border-border" />
            <div className="px-2 py-1 text-[10px] font-semibold text-text-tertiary/60 uppercase tracking-wider">
              未分组
            </div>
          </>
        )}
        {ungrouped.map((s) => (
          <SessionRow key={s.id} {...rowProps(s)} />
        ))}
      </>
    );
  };

  const renderChatList = () => {
    const pinned = filtered.filter((s) => s.pinned);
    const unpinned = filtered.filter((s) => !s.pinned);
    return (
      <>
        {pinned.map((s) => (
          <SessionRow key={s.id} {...rowProps(s)} />
        ))}
        {pinned.length > 0 && unpinned.length > 0 && (
          <div className="my-1 mx-2 border-t border-border" />
        )}
        {unpinned.map((s) => (
          <SessionRow key={s.id} {...rowProps(s)} />
        ))}
      </>
    );
  };

  return (
    <div className="flex h-full w-[240px] min-w-[240px] flex-col border-r border-border bg-bg-warm">
      {typeof navigator !== 'undefined' && /Mac|iPhone/.test(navigator.userAgent) && (
        <div className="h-[28px] shrink-0" />
      )}
      <ModeToggle mode={mode} onModeChange={onModeChange} />
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[12px] font-semibold text-text-secondary">
          {mode === 'chat' ? '对话' : 'Agents'}
        </span>
        <div className="flex items-center gap-0.5">
          {mode === 'agent' && (
            <Button variant="ghost" size="icon" onClick={handleCreateGroup} aria-label="New group">
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onNewChat} aria-label="New session">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <SessionSearch value={searchQuery} onChange={setSearchQuery} />
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1.5 pb-3 space-y-[1px]">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-[11px] text-text-tertiary">
              {searchQuery ? '没有匹配的对话' : `No ${mode} sessions yet`}
            </p>
          )}
          {mode === 'agent' && filtered.length > 0 ? renderAgentTree() : renderChatList()}
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
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除会话"
        message="确定要删除吗？此操作无法撤销。"
        confirmLabel="删除"
        variant="danger"
        onConfirm={() => {
          onDeleteSession(deleteTarget!);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
