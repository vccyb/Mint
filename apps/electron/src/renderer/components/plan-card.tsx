
import { ListTodo } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';
import { TodoList } from './todo-list';
import { AcceptPlanDropdown } from './accept-plan-dropdown';
import type { TodoItem } from '@/types';

interface PlanCardProps {
  content: string;
  todos: TodoItem[];
  isLastMessage: boolean;
  isStreaming: boolean;
  onApprove: (mode: 'auto' | 'manual') => void;
}

export function PlanCard({ content, todos, isLastMessage, isStreaming, onApprove }: PlanCardProps) {
  const completedTodos = todos.filter((t) => t.status === 'completed').length;
  const totalTodos = todos.length;

  return (
    <div className="mt-2 rounded-lg border border-success/20 bg-success/3 shadow-elevation-1">
      {/* Green header bar */}
      <div className="flex items-center gap-2 bg-success/8 px-3 py-2">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-success" />
        <span className="text-xs font-semibold text-success font-heading">Plan</span>
        {totalTodos > 0 && (
          <span className="pill bg-success/10 text-success text-[10px]">
            {completedTodos}/{totalTodos} tasks
          </span>
        )}
      </div>

      {/* Plan content */}
      {content && (
        <div className="px-3 py-2 text-sm leading-relaxed">
          <MarkdownRenderer content={content} />
        </div>
      )}

      {/* Task progress */}
      {todos.length > 0 && (
        <div className="px-3 pb-2">
          {totalTodos > 0 && (
            <div className="mb-1.5 h-0.5 rounded-full bg-success/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-success transition-[width] duration-500"
                style={{ width: `${(completedTodos / totalTodos) * 100}%` }}
              />
            </div>
          )}
          <TodoList todos={todos} />
        </div>
      )}

      {/* Accept actions — only on last message when not streaming */}
      {isLastMessage && !isStreaming && (
        <div className="flex items-center justify-end border-t border-success/10 px-3 py-2">
          <AcceptPlanDropdown onApprove={onApprove} />
        </div>
      )}
    </div>
  );
}
