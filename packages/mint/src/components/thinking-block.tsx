'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

const AUTO_CLOSE_DELAY = 1000;

interface ThinkingBlockProps {
  content: string;
  isStreaming: boolean;
  startTime?: number | null;
}

/** Sparkle icon for Mint-branded thinking indicator */
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="m12 3-1.9 5.7a2 2 0 0 1-1.3 1.3L3 12l5.7 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.7a2 2 0 0 1 1.3-1.3L21 12l-5.7-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export function ThinkingBlock({ content, isStreaming, startTime }: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-expand during streaming
  useEffect(() => {
    if (isStreaming && content) {
      setIsOpen(true);
    }
  }, [isStreaming, content]);

  // Auto-collapse 1s after streaming ends
  useEffect(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    if (!isStreaming && content) {
      autoCloseTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, AUTO_CLOSE_DELAY);
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isStreaming, content]);

  // Track duration with 100ms resolution for live timer
  useEffect(() => {
    if (isStreaming && startTime) {
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTime) / 100) / 10);
      }, 100);
    }

    if (!isStreaming && startTime) {
      setDuration(Math.round((Date.now() - startTime) / 100) / 10);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [isStreaming, startTime]);

  if (!content) return null;

  const effectivelyOpen = isStreaming ? true : isOpen;

  const durationText = isStreaming
    ? '思考中...'
    : duration > 0
      ? `思考了 ${duration}s`
      : '思考完毕';

  return (
    <div className="mb-2 rounded-xl border border-border overflow-hidden bg-card transition-all duration-200">
      {/* Header */}
      <button
        className="flex w-full items-center gap-2.5 px-4 py-3 text-xs cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={() => {
          if (!isStreaming) setIsOpen(!isOpen);
        }}
      >
        {isStreaming ? (
          <SparkleIcon className="h-4 w-4 shrink-0 text-primary animate-pulse" />
        ) : (
          <SparkleIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
        )}
        <span
          className={`font-medium text-[13px] ${isStreaming ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {durationText}
        </span>
        {isStreaming && duration > 0 && (
          <span className="font-mono text-[11px] text-primary tabular-nums ml-auto">
            {duration.toFixed(1)}s
          </span>
        )}
        {!isStreaming && <span className="flex-1" />}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text-tertiary transition-transform duration-200 ${
            effectivelyOpen ? '' : '-rotate-90'
          }`}
        />
      </button>

      {/* Expanded content */}
      {effectivelyOpen && (
        <div
          className={`border-t border-border bg-bg-warm px-4 py-3 pl-12 text-[13px] leading-relaxed text-muted-foreground ${
            isStreaming ? 'streaming-cursor' : ''
          }`}
        >
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
