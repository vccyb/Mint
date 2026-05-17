'use client';

import { cn } from '@/lib/utils';
import type { AskQuestionItem } from '@/types';

interface QuestionOptionsProps {
  question: AskQuestionItem;
  selectedOptions: string[];
  focusedOption: number;
  onToggle: (label: string) => void;
}

export function QuestionOptions({
  question,
  selectedOptions,
  focusedOption,
  onToggle,
}: QuestionOptionsProps) {
  return (
    <div className="space-y-1">
      {question.options.map((opt, oi) => {
        const selected = selectedOptions.includes(opt.label);
        return (
          <button
            key={opt.label}
            onClick={() => onToggle(opt.label)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors cursor-pointer',
              focusedOption === oi && 'ring-1 ring-primary/50',
              selected
                ? 'border-primary bg-primary-light'
                : 'border-border hover:bg-bg-warm',
            )}
          >
            {question.multiSelect ? (
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border',
                  selected ? 'border-primary bg-primary' : 'border-[rgba(0,0,0,0.16)]',
                )}
              >
                {selected && (
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </span>
            ) : (
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
                  selected ? 'border-primary' : 'border-[rgba(0,0,0,0.16)]',
                )}
              >
                {selected && <span className="h-[7px] w-[7px] rounded-full bg-primary" />}
              </span>
            )}
            <div className="min-w-0">
              <span className={cn(selected ? 'font-medium text-accent-foreground' : 'text-text')}>
                {opt.label}
              </span>
              {opt.description && (
                <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
                  {opt.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
