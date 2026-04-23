'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, MessageSquare, Bot, Trash2, Settings, Loader2, Check, Pin, PinOff,
  ChevronRight, FolderPlus, FolderInput,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ModeToggle } from './mode-toggle';
import { ConfirmDialog } from './confirm-dialog';
import { useStreamStatuses, type StreamStatus } from '@/lib/streaming-registry';
import type { Mode, SessionMetadata, SessionGroup } from '@/types';

interface SessionRowProps {
  session: SessionMetadata;
  mode: Mode;
  isActive: boolean;
  streamStatus: StreamStatus | undefined;
  isCompletedUnvisited: boolean;
  indent?: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDragStart?: (e: React.DragEvent, sessionId: string) => void;
  groups?: SessionGroup[];
  onMoveToGroup?: (sessionId: string, groupId: string | null) => void;
}

function SessionRow({
  session, mode, isActive, streamStatus, isCompletedUnvisited,
  indent, onSelect, onDelete, onTogglePin, onDragStart, groups, onMoveToGroup,
}: SessionRowProps) {
  const isStreaming = streamStatus?.isStreaming === true;
  const hasIndicator = mode === 'agent' && (isStreaming || isCompletedUnvisited);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex items-center gap-2 rounded-[5px] text-[13px] cursor-pointer transition-colors ${
        indent ? 'pl-6 pr-2.5' : hasIndicator ? 'pl-1.5 pr-2.5' : 'px-2.5'
      } py-1.5 ${
        isActive
          ? 'bg-primary-light text-primary-text font-medium'
          : 'text-text-secondary hover:bg-bg-warm'
      }`}
      onClick={() => onSelect(session.id)}
      draggable={mode === 'agent' && !!onDragStart}
      onDragStart={(e) => onDragStart?.(e, session.id)}
      onContextMenu={(e) => {
        if (mode === 'agent' && groups && groups.length > 0) {
          e.preventDefault();
          setShowMenu(true);
        }
      }}
    >
      {session.pinned && (
        <Pin className="h-3 w-3 text-primary/60 shrink-0 fill-primary/30" />
      )}
      {hasIndicator && isStreaming && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
      )}
      {hasIndicator && !isStreaming && (
        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
      )}
      {mode === 'chat' ? (
        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
      ) : (
        <Bot className="h-3.5 w-3.5 shrink-0 opacity-50" />
      )}
      <span className="flex-1 truncate">{session.title}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(session.id, !session.pinned);
          }}
          className="text-text-tertiary hover:text-primary"
          aria-label={session.pinned ? 'Unpin session' : 'Pin session'}
        >
          {session.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="text-text-tertiary hover:text-red-500"
          aria-label={`Delete session ${session.title}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {showMenu && (
        <ContextMenu
          groups={groups!}
          onClose={() => setShowMenu(false)}
          onSelect={(groupId) => {
            onMoveToGroup?.(session.id, groupId);
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}

function ContextMenu({
  groups, onClose, onSelect,
}: {
  groups: SessionGroup[];
  onClose: () => void;
  onSelect: (groupId: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 left-16 mt-8 w-40 rounded-md border border-border bg-bg shadow-lg py-1"
    >
      <div className="px-2 py-1 text-[11px] text-text-tertiary font-medium">移动到分组</div>
      <button
        className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-warm"
        onClick={() => onSelect(null)}
      >
        未分组
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-warm"
          onClick={() => onSelect(g.id)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}

interface GroupHeaderProps {
  group: SessionGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDrop: (sessionId: string) => void;
}

function GroupHeader({ group, isCollapsed, onToggle, onRename, onDelete, onDrop }: GroupHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(group.name); }, [group.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const handleSave = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== group.name) onRename(trimmed);
    else setDraft(group.name);
  };

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') { setDraft(group.name); setEditing(false); }
          }}
          className="bg-transparent border-b border-primary outline-none text-[12px] text-text-secondary w-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded-[5px] px-2 py-1 text-[12px] font-medium text-text-tertiary cursor-pointer hover:bg-bg-warm ${
        dragOver ? 'bg-primary-light/50' : ''
      }`}
      onClick={onToggle}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const sessionId = e.dataTransfer.getData('text/plain');
        if (sessionId) onDrop(sessionId);
      }}
    >
      <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
      <span className="flex-1 truncate">{group.name}</span>
      <span className="text-[10px] opacity-60">{group.sessionIds.length}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-text-tertiary hover:text-primary"
          aria-label="Rename group"
        >
          <FolderInput className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-text-tertiary hover:text-red-500"
          aria-label="Delete group"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

interface SessionSidebarProps {
  mode: Mode;
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
  onModeChange,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onTogglePin,
  onOpenSettings,
}: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const streamStatuses = useStreamStatuses();

  // Track completed sessions the user hasn't visited yet (agent mode only)
  const [unvisitedCompleted, setUnvisitedCompleted] = useState<Set<string>>(new Set());
  const prevStreamingIds = useRef<Set<string>>(new Set());

  // Detect streaming → completed transitions for agent sessions
  useEffect(() => {
    if (mode !== 'agent') {
      prevStreamingIds.current = new Set();
      return;
    }

    const currentStreamingIds = new Set<string>();
    for (const [id, status] of streamStatuses) {
      if (status.isStreaming) currentStreamingIds.add(id);
    }

    for (const id of prevStreamingIds.current) {
      if (!currentStreamingIds.has(id)) {
        setUnvisitedCompleted((prev) => new Set(prev).add(id));
      }
    }

    prevStreamingIds.current = currentStreamingIds;
  }, [mode, streamStatuses]);

  const handleSelectSession = useCallback((id: string) => {
    setUnvisitedCompleted((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onSelectSession(id);
  }, [onSelectSession]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?mode=${mode}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      // ignore
    }
  }, [mode]);

  const loadGroups = useCallback(async () => {
    if (mode !== 'agent') return;
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    loadSessions();
    loadGroups();
  }, [loadSessions, loadGroups, activeSessionId]);

  // Group operations
  const handleCreateGroup = useCallback(async () => {
    const name = `分组 ${groups.length + 1}`;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((prev) => [...prev, group]);
    }
  }, [groups.length]);

  const handleRenameGroup = useCallback(async (groupId: string, name: string) => {
    await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, name } : g));
  }, []);

  const handleDeleteGroup = useCallback(async (groupId: string) => {
    await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  const handleMoveToGroup = useCallback(async (sessionId: string, groupId: string | null) => {
    if (groupId) {
      await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moveSession: sessionId }),
      });
    } else {
      // Move to ungrouped
      await fetch('/api/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    }
    loadGroups();
  }, [loadGroups]);

  const handleDragStart = useCallback((_e: React.DragEvent, sessionId: string) => {
    _e.dataTransfer.setData('text/plain', sessionId);
    _e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDropOnGroup = useCallback(async (groupId: string, sessionId: string) => {
    await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moveSession: sessionId }),
    });
    loadGroups();
  }, [loadGroups]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Build group membership map
  const sessionGroupMap = new Map<string, string>();
  for (const g of groups) {
    for (const sid of g.sessionIds) {
      sessionGroupMap.set(sid, g.id);
    }
  }

  const renderAgentTree = () => {
    const pinned = sessions.filter((s) => s.pinned);
    const groupedSessions = new Set<string>();
    for (const g of groups) {
      for (const sid of g.sessionIds) groupedSessions.add(sid);
    }
    const ungrouped = sessions.filter((s) => !s.pinned && !groupedSessions.has(s.id));

    return (
      <>
        {/* Pinned sessions */}
        {pinned.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            mode={mode}
            isActive={activeSessionId === session.id}
            streamStatus={streamStatuses.get(session.id)}
            isCompletedUnvisited={unvisitedCompleted.has(session.id)}
            onSelect={handleSelectSession}
            onDelete={setDeleteTarget}
            onTogglePin={onTogglePin}
            onDragStart={handleDragStart}
            groups={groups}
            onMoveToGroup={handleMoveToGroup}
          />
        ))}
        {pinned.length > 0 && (groups.length > 0 || ungrouped.length > 0) && (
          <div className="my-1 mx-2 border-t border-border" />
        )}

        {/* Groups */}
        {groups.map((group) => {
          const groupSessions = group.sessionIds
            .map((sid) => sessions.find((s) => s.id === sid))
            .filter(Boolean) as SessionMetadata[];
          const isCollapsed = collapsedGroups.has(group.id);

          return (
            <div key={group.id}>
              <GroupHeader
                group={group}
                isCollapsed={isCollapsed}
                onToggle={() => toggleGroup(group.id)}
                onRename={(name) => handleRenameGroup(group.id, name)}
                onDelete={() => handleDeleteGroup(group.id)}
                onDrop={(sessionId) => handleDropOnGroup(group.id, sessionId)}
              />
              {!isCollapsed && groupSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  mode={mode}
                  isActive={activeSessionId === session.id}
                  streamStatus={streamStatuses.get(session.id)}
                  isCompletedUnvisited={unvisitedCompleted.has(session.id)}
                  indent
                  onSelect={handleSelectSession}
                  onDelete={setDeleteTarget}
                  onTogglePin={onTogglePin}
                  onDragStart={handleDragStart}
                  groups={groups}
                  onMoveToGroup={handleMoveToGroup}
                />
              ))}
            </div>
          );
        })}

        {/* Ungrouped */}
        {ungrouped.length > 0 && groups.length > 0 && (
          <>
            <div className="my-1 mx-2 border-t border-border" />
            <div className="px-2 py-1 text-[11px] font-medium text-text-tertiary/60 uppercase">未分组</div>
          </>
        )}
        {ungrouped.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            mode={mode}
            isActive={activeSessionId === session.id}
            streamStatus={streamStatuses.get(session.id)}
            isCompletedUnvisited={unvisitedCompleted.has(session.id)}
            onSelect={handleSelectSession}
            onDelete={setDeleteTarget}
            onTogglePin={onTogglePin}
            onDragStart={handleDragStart}
            groups={groups}
            onMoveToGroup={handleMoveToGroup}
          />
        ))}
      </>
    );
  };

  const renderChatList = () => {
    const pinned = sessions.filter((s) => s.pinned);
    const unpinned = sessions.filter((s) => !s.pinned);
    return (
      <>
        {pinned.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            mode={mode}
            isActive={activeSessionId === session.id}
            streamStatus={streamStatuses.get(session.id)}
            isCompletedUnvisited={false}
            onSelect={handleSelectSession}
            onDelete={setDeleteTarget}
            onTogglePin={onTogglePin}
          />
        ))}
        {pinned.length > 0 && unpinned.length > 0 && (
          <div className="my-1 mx-2 border-t border-border" />
        )}
        {unpinned.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            mode={mode}
            isActive={activeSessionId === session.id}
            streamStatus={streamStatuses.get(session.id)}
            isCompletedUnvisited={false}
            onSelect={handleSelectSession}
            onDelete={setDeleteTarget}
            onTogglePin={onTogglePin}
          />
        ))}
      </>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/80 bg-[#f8f3ea]/90 backdrop-blur">
      {/* Fixed top: Mode toggle */}
      <ModeToggle mode={mode} onModeChange={onModeChange} />

      {/* Fixed: section header */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
          {mode === 'chat' ? 'Chats' : 'Agents'}
        </span>
        <div className="flex items-center gap-1">
          {mode === 'agent' && (
            <Button variant="ghost" size="icon" onClick={handleCreateGroup} aria-label="New group">
              <FolderPlus className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onNewChat} aria-label="New session">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable session list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-3 space-y-0.5">
          {sessions.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-text-tertiary">
              No {mode} sessions yet
            </p>
          )}
          {mode === 'agent' && sessions.length > 0 ? renderAgentTree() : renderChatList()}
        </div>
      </ScrollArea>

      {/* Fixed bottom: Settings */}
      <div className="border-t border-border/80 p-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-text-secondary transition-colors cursor-pointer hover:bg-white/70"
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          Settings
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
