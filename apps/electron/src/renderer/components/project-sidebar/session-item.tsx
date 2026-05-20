
import { useState } from 'react';
import { Pin, PinOff, X, Check } from 'lucide-react';
import type { SessionMetadata } from '@/types';

/** 会话列表项 */
export interface SessionItemProps {
  session: SessionMetadata;
  active: boolean;
  isStreaming?: boolean;
  isCompleted?: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  active,
  isStreaming,
  isCompleted,
  onClick,
  onTogglePin,
  onDelete,
}: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors relative group ${
        active ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Streaming spinner or completed check */}
      {isStreaming && <div className="spinner-dot shrink-0" />}
      {isCompleted && !isStreaming && <Check className="w-3 h-3 text-success shrink-0" />}
      {/* Title */}
      <span className="flex-1 text-xs truncate">{session.title}</span>
      {isStreaming && <span className="text-[10px] text-primary shrink-0">运行中</span>}
      {isCompleted && !isStreaming && (
        <span className="text-[10px] text-success shrink-0">已完成</span>
      )}
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
