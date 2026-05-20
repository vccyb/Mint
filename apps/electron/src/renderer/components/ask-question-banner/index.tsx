
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircleQuestion, ChevronRight, ChevronDown, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PermissionRequestData, AskQuestionItem } from '@/types';
import { PermissionBar } from './permission-bar';
import { QuestionOptions } from './question-options';

interface AskQuestionBannerProps {
  request: PermissionRequestData;
  onDecision: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  pinned?: boolean;
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function AskQuestionBanner({ request, onDecision, pinned = false }: AskQuestionBannerProps) {
  const questions = (request.input.questions ?? []) as AskQuestionItem[];
  const [activeTab, setActiveTab] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [focusedOption, setFocusedOption] = useState(-1);
  const customInputRef = useRef<HTMLInputElement>(null);

  const currentQ = questions[activeTab];
  const isLastTab = activeTab === questions.length - 1;

  const isQuestionAnswered = useCallback(
    (q: AskQuestionItem) => {
      const opts = selectedOptions[q.question] ?? [];
      const custom = customAnswers[q.question]?.trim();
      return opts.length > 0 || !!custom;
    },
    [selectedOptions, customAnswers],
  );

  useEffect(() => {
    setFocusedOption(-1);
  }, [activeTab]);

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
          toggleOption(currentQ, currentQ.options[focusedOption].label);
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

  // Non-AskUserQuestion permission
  if (request.toolName !== 'AskUserQuestion' || questions.length === 0) {
    return <PermissionBar request={request} onDecision={onDecision} pinned={pinned} />;
  }

  // Collapsed bar
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={cn(
          'flex w-full items-center gap-2 rounded-xl border px-4 py-2 text-left',
          'border-border shadow-sm bg-card',
          'hover:bg-primary-light/30 transition-colors cursor-pointer',
          pinned && 'mx-auto max-w-[640px]',
        )}
      >
        <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-xs font-medium text-primary truncate">
          {questions.length} question{questions.length > 1 ? 's' : ''} pending...
        </span>
        <span className="text-xs text-text-tertiary truncate">{questions[0]?.question}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary ml-auto" />
      </button>
    );
  }

  // Full card
  return (
    <div
      className={cn(
        'rounded-xl border border-border shadow-sm bg-card',
        'overflow-hidden animate-slide-up',
        pinned && 'mx-auto max-w-[640px]',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border bg-bg-warm">
        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-primary-light">
          <SparkleIcon className="text-primary" />
        </div>
        <span className="text-xs font-semibold text-text">Mint 有一个问题</span>
        {questions.length > 1 && (
          <span className="text-[10px] bg-primary-light rounded px-1.5 py-0.5 text-primary font-medium">
            {questions.length} 个问题
          </span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text transition-colors cursor-pointer"
          aria-label="Minimize question"
        >
          <Minimize2 className="h-3 w-3" />
        </button>
      </div>

      {/* Tab bar */}
      {questions.length > 1 && (
        <div className="flex items-center gap-1 px-3.5 py-1.5 border-b border-[rgba(0,0,0,0.06)] overflow-x-auto">
          {questions.map((q, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
                activeTab === i
                  ? 'bg-primary text-primary-foreground'
                  : isQuestionAnswered(q)
                    ? 'bg-success/10 text-success hover:bg-success/15'
                    : 'bg-bg-warm text-text-secondary hover:bg-bg-hover',
              )}
            >
              {isQuestionAnswered(q) && activeTab !== i && (
                <span className="text-success">&#10003;</span>
              )}
              {q.header || `Q${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Question content */}
      {currentQ && (
        <div className="px-3.5 py-3">
          <p className="text-[13px] font-medium text-text mb-2.5">{currentQ.question}</p>

          <QuestionOptions
            question={currentQ}
            selectedOptions={selectedOptions[currentQ.question] ?? []}
            focusedOption={focusedOption}
            onToggle={(label) => toggleOption(currentQ, label)}
          />

          {/* Free text input + Submit */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <input
              ref={customInputRef}
              type="text"
              placeholder="输入自定义回答..."
              value={customAnswers[currentQ.question] ?? ''}
              onChange={(e) =>
                setCustomAnswers((prev) => ({
                  ...prev,
                  [currentQ.question]: e.target.value,
                }))
              }
              className={cn(
                'flex-1 rounded-md border border-border bg-bg-warm px-2.5 py-1.5',
                'text-xs text-text placeholder:text-text-tertiary',
                'focus:border-primary focus:bg-card focus:outline-none',
                focusedOption === currentQ.options.length && 'ring-1 ring-primary/50',
              )}
            />
            <button
              onClick={handleNext}
              disabled={!isQuestionAnswered(currentQ)}
              className={cn(
                'rounded-lg px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer shrink-0',
                isQuestionAnswered(currentQ)
                  ? 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_2px_6px_rgba(0,122,255,0.25)]'
                  : 'bg-bg-warm text-text-tertiary cursor-not-allowed',
              )}
            >
              提交
            </button>
          </div>
        </div>
      )}

      {/* Actions footer for multi-question */}
      {questions.length > 1 && (
        <div className="flex items-center gap-2 px-3.5 py-2 border-t border-[rgba(0,0,0,0.06)]">
          <button
            onClick={() => onDecision(request.requestId, 'deny')}
            className="rounded-md border border-border px-3 py-1 text-xs text-text-secondary hover:bg-bg-warm cursor-pointer"
          >
            取消
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-text-tertiary">
            {activeTab + 1}/{questions.length}
          </span>
          <button
            onClick={handleNext}
            disabled={!isQuestionAnswered(currentQ)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer',
              isQuestionAnswered(currentQ)
                ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                : 'bg-bg-warm text-text-tertiary cursor-not-allowed',
            )}
          >
            {isLastTab ? '提交' : '下一题'}
            {!isLastTab && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
      )}
    </div>
  );
}
