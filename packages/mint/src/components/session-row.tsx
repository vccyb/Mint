'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Bot, Trash2, Pin, PinOff, Check } from 'lucide-react';
import type { Mode, SessionMetadata, SessionGroup } from '@/types';
import type { StreamStatus } from '@/lib/streaming-registry';

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

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) {
    const d = new Date(timestamp);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function SessionRow({
  session, mode, isActive, streamStatus, isCompletedUnvisited,
  indent, onSelect, onDelete, onTogglePin, onDragStart, groups, onMoveToGroup,
}: SessionRowProps) {
  const isStreaming = streamStatus?.isStreaming === true;
  const hasIndicator = isStreaming || isCompletedUnvisited;
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group relative flex items-center gap-2 rounded-[6px] text-[12px] cursor-pointer transition-colors ${
        indent ? 'pl-5 pr-2' : 'px-2'
      } py-[6px] ${
        isActive
          ? 'bg-[#E8F2FF]'
          : 'hover:bg-bg-hover'
      }`}
      onClick={() => onSelect(session.id)}
      draggable={!!onDragStart}
      onDragStart={(e) => onDragStart?.(e, session.id)}
      onContextMenu={(e) => {
        if (groups && groups.length > 0) {
          e.preventDefault();
          setShowMenu(true);
        }
      }}
    >
      {/* Streaming spinner or completed check */}
      {hasIndicator && isStreaming && (
        <div className="spinner-dot shrink-0" />
      )}
      {hasIndicator && !isStreaming && (
        <Check className="h-3 w-3 text-success shrink-0" />
      )}
      {/* Mode icon */}
      {!hasIndicator && (
        mode === 'chat' ? (
          <MessageSquare className="h-3 w-3 shrink-0 text-text-tertiary" />
        ) : (
          <Bot className="h-3 w-3 shrink-0 text-text-tertiary" />
        )
      )}
      {/* Pinned icon */}
      {session.pinned && (
        <Pin className="h-2.5 w-2.5 text-primary/50 shrink-0 fill-primary/20" />
      )}
      {/* Title & subtitle */}
      <div className="flex-1 min-w-0">
        <div className={`truncate ${isActive ? 'font-medium text-primary-text' : 'text-text'}`}>
          {session.title}
        </div>
        {isStreaming ? (
          <div className="text-[10px] text-primary">运行中</div>
        ) : (
          <div className="text-[10px] text-text-tertiary">
            {formatRelativeTime(session.updatedAt)}
          </div>
        )}
      </div>
      {/* Hover actions */}
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
      className="absolute z-50 left-10 mt-6 w-36 rounded-lg border border-border bg-bg shadow-lg py-1"
    >
      <div className="px-2 py-1 text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">
        移动到分组
      </div>
      <button
        className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover cursor-pointer"
        onClick={() => onSelect(null)}
      >
        未分组
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          className="w-full text-left px-2 py-1.5 text-[12px] text-text-secondary hover:bg-bg-hover cursor-pointer"
          onClick={() => onSelect(g.id)}
        >
          {g.name}
        </button>
      ))}
    </div>
  );
}
