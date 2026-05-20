'use client';

import { cn } from '@/lib/utils';
import type { TodoItem } from '@/types';

interface TodoListProps {
  todos: TodoItem[];
  /** When true, renders as a card designed to be pinned above the input */
  pinned?: boolean;
  /** Optional tool info to display alongside tasks */
  toolInfo?: Record<number, string>;
  /** Callback to dismiss the pinned TodoList */
  onDismiss?: () => void;
  /** Number of running agents to show as a badge */
  teamCount?: number;
}

/* ─── Status Icons (SVG) ───────────────────────────── */

function CompletedIcon() {
  return (
    <div className="h-4 w-4 rounded bg-success flex items-center justify-center shrink-0">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}

function InProgressIcon() {
  return (
    <div className="h-4 w-4 rounded border-[1.5px] border-primary flex items-center justify-center shrink-0">
      <div className="h-[9px] w-[9px] rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function PendingIcon() {
  return <div className="h-4 w-4 rounded border-[1.5px] border-border shrink-0" />;
}

/* ─── Main Component ───────────────────────────────── */

export function TodoList({ todos, pinned = false, toolInfo, onDismiss, teamCount }: TodoListProps) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  if (pinned) {
    return (
      <div className={cn('rounded-xl border border-border shadow-sm bg-card', 'overflow-hidden')}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-border bg-bg-warm">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-primary-light">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#007AFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text">任务清单</span>
          <span className="ml-auto text-[10px] font-semibold text-success font-mono">
            {completed}/{total}
          </span>
          {teamCount != null && teamCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-primary font-medium">
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {teamCount}
            </span>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="h-4 w-4 rounded flex items-center justify-center hover:bg-[rgba(0,0,0,0.06)] transition-colors shrink-0 cursor-pointer"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6E6E73"
                strokeWidth="3"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="px-3.5 pt-1.5">
          <div className="h-[3px] rounded-full bg-bg-hover overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="px-2.5 py-1.5 space-y-px">
          {todos.map((todo, i) => (
            <TodoRow key={i} todo={todo} toolInfo={toolInfo?.[i]} />
          ))}
        </div>
      </div>
    );
  }

  // Inline (non-pinned) mode — used inside message stream
  return (
    <div className={cn('rounded-xl border border-border shadow-sm bg-card')}>
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[rgba(0,0,0,0.06)]">
        <span className="text-xs font-medium text-text-secondary">任务清单</span>
        <span className="text-[10px] text-text-tertiary">
          ({completed}/{total} 已完成)
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-3 pt-2">
        <div className="h-[3px] rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="px-2 py-2 space-y-px">
        {todos.map((todo, i) => (
          <TodoRow key={i} todo={todo} toolInfo={toolInfo?.[i]} />
        ))}
      </div>
    </div>
  );
}

/* ─── Todo Row ─────────────────────────────────────── */

function TodoRow({ todo, toolInfo }: { todo: TodoItem; toolInfo?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 px-1.5 py-[5px] rounded-md',
        todo.status === 'in_progress' && 'bg-[rgba(0,122,255,0.03)]',
      )}
    >
      {/* Status icon */}
      <div className="mt-[2px] shrink-0">
        {todo.status === 'completed' ? (
          <CompletedIcon />
        ) : todo.status === 'in_progress' ? (
          <InProgressIcon />
        ) : (
          <PendingIcon />
        )}
      </div>

      {/* Text + tool info */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-xs leading-[18px]',
            todo.status === 'completed' && 'text-text-tertiary line-through',
            todo.status === 'in_progress' && 'text-text font-medium',
            todo.status === 'pending' && 'text-text-tertiary',
          )}
        >
          {todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}
        </div>
        {(toolInfo || todo.status === 'completed') && (
          <div
            className={cn(
              'text-[9px] font-mono mt-0.5',
              todo.status === 'in_progress' ? 'text-primary' : 'text-text-tertiary',
            )}
          >
            {todo.status === 'in_progress' ? `${toolInfo ?? ''} · 运行中...` : toolInfo}
          </div>
        )}
      </div>
    </div>
  );
}
