
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit,
  X,
} from 'lucide-react';
import type { Project } from '@/types';

interface ProjectRowProps {
  project: Project;
  isExpanded: boolean;
  isHovered: boolean;
  showMenu: boolean;
  sessionCount: number;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  onToggleMenu: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNewSession: () => void;
}

export function ProjectRow({
  project,
  isExpanded,
  isHovered,
  showMenu,
  sessionCount,
  onSelect,
  onHoverChange,
  onToggleMenu,
  onRename,
  onDelete,
  onNewSession,
}: ProjectRowProps) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-hover cursor-pointer transition-colors min-h-[28px]"
      onClick={onSelect}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
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
        {sessionCount > 0 && !isHovered && (
          <span className="text-[10px] text-text-tertiary">
            {sessionCount}
          </span>
        )}

        {/* Hover 时显示的操作按钮 */}
        {isHovered && (
          <>
            {/* 更多操作按钮 */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu();
                }}
                className="p-1 hover:bg-bg-hover rounded"
                title="更多操作"
              >
                <MoreHorizontal className="w-3 h-3 text-text-tertiary" />
              </button>

              {/* 下拉菜单 */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenu();
                    }}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-bg-warm backdrop-blur-sm border border-border rounded-lg shadow-sm py-1 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRename();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-text hover:bg-primary-light hover:text-primary transition-colors duration-150 flex items-center gap-2"
                    >
                      <Edit className="w-3 h-3 opacity-60" />
                      重命名
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-error hover:bg-red-50 hover:text-destructive transition-colors duration-150 flex items-center gap-2"
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
                onNewSession();
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
  );
}
