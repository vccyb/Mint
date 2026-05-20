
import { useState } from 'react';
import { MessageCircleQuestion, ListTodo, ListChecks, ChevronDown, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionRequestData, AskQuestionItem, TodoItem } from '@/types';

/* ─── Shared Types ─────────────────────────────────── */

export type InteractionType = 'permission' | 'todo' | 'plan';

export interface InteractionPanelProps {
  type: InteractionType;
  /** When true, renders as a compact card pinned above the input box */
  pinned?: boolean;
  // Permission
  permissionRequest?: PermissionRequestData | null;
  onPermissionDecision?: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  // Todo
  todos?: TodoItem[];
  // Plan
  planContent?: string;
  planTodos?: TodoItem[];
  isPlanStreaming?: boolean;
  onApprovePlan?: (mode: 'auto' | 'manual') => void;
}

/* ─── Type Config ──────────────────────────────────── */

const TYPE_CONFIG: Record<
  InteractionType,
  {
    icon: typeof MessageCircleQuestion;
    label: string;
    accentBg: string;
    accentText: string;
    accentBorder: string;
  }
> = {
  permission: {
    icon: MessageCircleQuestion,
    label: 'Agent 请求',
    accentBg: 'bg-bg-warm',
    accentText: 'text-primary',
    accentBorder: 'border-border',
  },
  todo: {
    icon: ListTodo,
    label: '任务进度',
    accentBg: 'bg-bg-warm',
    accentText: 'text-text-secondary',
    accentBorder: 'border-border',
  },
  plan: {
    icon: ListChecks,
    label: '执行计划',
    accentBg: 'bg-bg-warm',
    accentText: 'text-success',
    accentBorder: 'border-border',
  },
};

/* ─── Main Component ───────────────────────────────── */

export function InteractionPanel({
  type,
  pinned = false,
  permissionRequest,
  onPermissionDecision: _onPermissionDecision,
  todos,
  planContent: _planContent,
  planTodos,
  isPlanStreaming: _isPlanStreaming,
  onApprovePlan: _onApprovePlan,
}: InteractionPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const activeTodos = type === 'todo' ? todos : planTodos;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border px-4 py-2 text-left',
          'border-border shadow-sm bg-card',
          'animate-fade-in cursor-pointer',
          pinned && 'mx-auto max-w-[640px]',
        )}
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0', config.accentText)} />
        <span className={cn('text-xs font-medium', config.accentText)}>
          {type === 'permission' && permissionRequest
            ? permissionRequest.toolName === 'AskUserQuestion'
              ? `${((permissionRequest.input.questions ?? []) as AskQuestionItem[]).length} 个问题待回答...`
              : `${permissionRequest.toolName} 请求审批`
            : type === 'todo'
              ? `${todos?.length ?? 0} 个任务进行中`
              : '计划待审批'}
        </span>
        <ChevronDown className={cn('h-3 w-3 shrink-0 ml-auto', config.accentText)} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border shadow-sm bg-card',
        'overflow-hidden animate-slide-up',
        pinned && 'mx-auto max-w-[640px]',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 border-b border-border',
          config.accentBg,
        )}
      >
        <div
          className={cn(
            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md',
            'bg-primary-light',
          )}
        >
          <Icon className="h-3 w-3 text-primary" />
        </div>
        <span className="text-xs font-semibold text-text">
          {type === 'todo' ? '任务清单' : config.label}
        </span>
        {type === 'todo' && activeTodos && activeTodos.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-success font-mono">
            {activeTodos.filter((t) => t.status === 'completed').length}/{activeTodos.length}
          </span>
        )}
        {type === 'permission' && permissionRequest?.toolName === 'AskUserQuestion' && (
          <span className="ml-auto text-[10px] text-text-tertiary font-mono">AskUserQuestion</span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-hover hover:text-text transition-colors cursor-pointer"
          aria-label="Minimize panel"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Placeholder content — actual content rendered by child components */}
      <div className="max-h-[40vh] overflow-y-auto">
        {type === 'todo' && activeTodos && <TodoPinnedContent todos={activeTodos} />}
      </div>
    </div>
  );
}

/* ─── Todo Pinned Content ──────────────────────────── */

function TodoPinnedContent({ todos }: { todos: TodoItem[] }) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <>
      {/* Progress bar */}
      <div className="px-3.5 pt-1.5">
        <div className="h-[3px] rounded-full bg-bg-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success to-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="px-2.5 py-1.5 space-y-px">
        {todos.map((todo, i) => (
          <div
            key={i}
            className={cn(
              'flex items-start gap-1.5 px-1.5 py-[5px] rounded-md',
              todo.status === 'in_progress' && 'bg-[rgba(0,122,255,0.03)]',
            )}
          >
            {/* Status icon */}
            <div className="mt-[2px] shrink-0">
              {todo.status === 'completed' ? (
                <div className="h-4 w-4 rounded bg-success flex items-center justify-center">
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ) : todo.status === 'in_progress' ? (
                <div className="h-4 w-4 rounded border-[1.5px] border-primary flex items-center justify-center">
                  <div className="h-[9px] w-[9px] rounded-full border-[1.5px] border-primary border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded border-[1.5px] border-border" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-xs',
                  todo.status === 'completed' && 'text-text-tertiary line-through',
                  todo.status === 'in_progress' && 'text-text font-medium',
                  todo.status === 'pending' && 'text-text-tertiary',
                )}
              >
                {todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
