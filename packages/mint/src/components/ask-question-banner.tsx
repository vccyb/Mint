'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircleQuestion, ChevronRight, ChevronDown, Minimize2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionRequestData, AskQuestionItem } from '@/types';

interface AskQuestionBannerProps {
  request: PermissionRequestData;
  onDecision: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
}

export function AskQuestionBanner({ request, onDecision }: AskQuestionBannerProps) {
  const questions = (request.input.questions ?? []) as AskQuestionItem[];
  const [activeTab, setActiveTab] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [focusedOption, setFocusedOption] = useState(-1);
  const customInputRef = useRef<HTMLInputElement>(null);

  const currentQ = questions[activeTab];
  const isLastTab = activeTab === questions.length - 1;

  const isQuestionAnswered = useCallback((q: AskQuestionItem) => {
    const opts = selectedOptions[q.question] ?? [];
    const custom = customAnswers[q.question]?.trim();
    return opts.length > 0 || !!custom;
  }, [selectedOptions, customAnswers]);

  const allAnswered = questions.length === 0 || questions.every(isQuestionAnswered);

  // Reset focused option when tab changes
  useEffect(() => {
    setFocusedOption(-1);
  }, [activeTab]);

  // Keyboard navigation
  useEffect(() => {
    if (collapsed || !currentQ) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeTab > 0) {
        e.preventDefault();
        setActiveTab((t) => t - 1);
      } else if (e.key === 'ArrowRight' && activeTab < questions.length - 1) {
        e.preventDefault();
        setActiveTab((t) => t + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedOption((f) => Math.max(-1, f - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const maxIdx = currentQ.options.length;
        setFocusedOption((f) => Math.min(f + 1, maxIdx));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedOption >= 0 && focusedOption < currentQ.options.length) {
          const opt = currentQ.options[focusedOption];
          toggleOption(currentQ, opt.label);
        } else if (focusedOption === currentQ.options.length) {
          customInputRef.current?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, activeTab, currentQ, focusedOption, questions.length]);

  const toggleOption = (q: AskQuestionItem, label: string) => {
    setSelectedOptions((prev) => {
      const current = prev[q.question] ?? [];
      if (q.multiSelect) {
        const next = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
        return { ...prev, [q.question]: next };
      }
      // Single select: toggle off if same, else set
      return { ...prev, [q.question]: current.includes(label) ? [] : [label] };
    });
  };

  const handleSubmit = () => {
    const finalAnswers: Record<string, string> = {};
    for (const q of questions) {
      const custom = customAnswers[q.question]?.trim();
      if (custom) {
        finalAnswers[q.question] = custom;
      } else {
        const opts = selectedOptions[q.question] ?? [];
        finalAnswers[q.question] = opts.join(', ');
      }
    }
    const updatedInput = { ...request.input, answers: finalAnswers };
    onDecision(request.requestId, 'allow', updatedInput);
  };

  const handleNext = () => {
    if (isLastTab) {
      handleSubmit();
    } else {
      setActiveTab((t) => t + 1);
    }
  };

  // Empty questions fallback
  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-text">
          <MessageCircleQuestion className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{String(request.input.question || 'Agent is asking a question')}</span>
          <div className="flex-1" />
          <button
            onClick={() => onDecision(request.requestId, 'deny')}
            className="rounded border border-border px-2 py-0.5 text-xs text-text-secondary hover:bg-bg-hover"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Collapsed: show a tiny bar with question summary
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="mx-auto flex max-w-3xl w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-left shadow-whisper-sm hover:bg-primary/10 transition-colors"
      >
        <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-xs font-medium text-primary truncate">
          {questions.length} question{questions.length > 1 ? 's' : ''} pending...
        </span>
        <span className="text-xs text-text-tertiary truncate">
          {questions[0]?.question}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary ml-auto" />
      </button>
    );
  }

  // Tabbed interface
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-primary/30 bg-primary/5 shadow-whisper-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20">
        <MessageCircleQuestion className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-text">
          Agent has a question
        </span>
        <span className="text-[10px] bg-primary/10 rounded px-1.5 py-0.5 text-primary font-medium">
          {questions.length} question{questions.length > 1 ? 's' : ''}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text transition-colors"
          aria-label="Minimize question"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Tab bar */}
      {questions.length > 1 && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-primary/15 overflow-x-auto">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                activeTab === i
                  ? 'bg-primary text-white'
                  : isQuestionAnswered(q)
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-bg-warm text-text-secondary hover:bg-bg-hover',
              )}
            >
              {isQuestionAnswered(q) && activeTab !== i && (
                <span className="text-green-500">&#10003;</span>
              )}
              {q.header || `Q${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Question content */}
      {currentQ && (
        <div className="px-3 py-2.5">
          <p className="text-sm font-medium text-text mb-2">
            {currentQ.question}
          </p>

          {/* Options */}
          <div className="space-y-1">
            {currentQ.options.map((opt, oi) => {
              const selected = (selectedOptions[currentQ.question] ?? []).includes(opt.label);
              return (
                <button
                  key={opt.label}
                  onClick={() => toggleOption(currentQ, opt.label)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors',
                    focusedOption === oi && 'ring-1 ring-primary/50',
                    selected
                      ? currentQ.multiSelect
                        ? 'border-primary bg-primary/10 text-text'
                        : 'border-primary bg-primary/10 text-text'
                      : 'border-border bg-bg text-text-secondary hover:bg-bg-hover',
                  )}
                >
                  <span className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-border',
                  )}>
                    {selected && (
                      currentQ.multiSelect
                        ? <span className="text-[10px]">&#10003;</span>
                        : <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <span className={cn(selected && 'font-medium')}>{opt.label}</span>
                    {opt.description && (
                      <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{opt.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom answer input */}
          <input
            ref={customInputRef}
            type="text"
            placeholder="Or type a custom answer..."
            value={customAnswers[currentQ.question] ?? ''}
            onChange={(e) =>
              setCustomAnswers((prev) => ({
                ...prev,
                [currentQ.question]: e.target.value,
              }))
            }
            className={cn(
              'mt-1.5 w-full rounded-md border border-border bg-bg px-2.5 py-1 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none',
              focusedOption === currentQ.options.length && 'ring-1 ring-primary/50',
            )}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-3 py-2 border-t border-primary/20">
        <button
          onClick={() => onDecision(request.requestId, 'deny')}
          className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Cancel
        </button>
        <div className="flex-1" />
        {questions.length > 1 && (
          <span className="text-[10px] text-text-tertiary self-center">
            {activeTab + 1}/{questions.length}
          </span>
        )}
        <button
          onClick={handleNext}
          disabled={!isQuestionAnswered(currentQ)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1',
            isQuestionAnswered(currentQ)
              ? 'bg-primary text-white hover:bg-primary-hover'
              : 'bg-bg-warm text-text-tertiary cursor-not-allowed',
          )}
        >
          {isLastTab ? 'Submit' : 'Next'}
          {!isLastTab && <ChevronRight className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
