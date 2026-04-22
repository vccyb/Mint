'use client';

import { Circle, CheckCircle2, Loader2, ListTodo } from 'lucide-react';
import type { TodoItem } from '@/types';

interface TodoListProps {
  todos: TodoItem[];
}

function TodoIcon({ status }: { status: TodoItem['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className='h-3.5 w-3.5 shrink-0 text-green-600' />;
    case 'in_progress':
      return <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin text-primary' />;
    case 'pending':
    default:
      return <Circle className='h-3.5 w-3.5 shrink-0 text-text-tertiary' />;
  }
}

export function TodoList({ todos }: TodoListProps) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;
  const pending = todos.filter((t) => t.status === 'pending').length;

  const parts: string[] = [];
  if (completed > 0) parts.push(`${completed} done`);
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  if (pending > 0) parts.push(`${pending} open`);
  const statusText = parts.join(', ');

  return (
    <div className='mt-2 rounded-md border border-border bg-bg-warm/50 px-2.5 py-2'>
      <div className='flex items-center gap-1.5 mb-1.5'>
        <ListTodo className='h-3.5 w-3.5 shrink-0 text-text-tertiary' />
        <span className='text-xs font-medium text-text-secondary'>
          {todos.length} task{todos.length !== 1 ? 's' : ''}
        </span>
        {statusText && (
          <span className='text-[10px] text-text-tertiary'>
            ({statusText})
          </span>
        )}
      </div>
      <div className='space-y-0.5'>
        {todos.map((todo, i) => (
          <div
            key={i}
            className='flex items-start gap-2 py-0.5 text-xs'
          >
            <div className='mt-0.5'>
              <TodoIcon status={todo.status} />
            </div>
            <span
              className={
                todo.status === 'completed'
                  ? 'line-through text-text-tertiary'
                  : todo.status === 'in_progress'
                    ? 'text-text font-medium'
                    : 'text-text-secondary'
              }
            >
              {todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
