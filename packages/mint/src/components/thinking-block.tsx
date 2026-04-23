'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer } from './markdown-renderer';

const AUTO_CLOSE_DELAY = 1000;

interface ThinkingBlockProps {
  content: string;
  isStreaming: boolean;
  startTime?: number | null;
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

  // Track duration
  useEffect(() => {
    if (isStreaming && startTime) {
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTime) / 1000));
      }, 1000);
    }

    if (!isStreaming && startTime) {
      setDuration(Math.round((Date.now() - startTime) / 1000));
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
      ? `思考了 ${duration} 秒`
      : '思考完毕';

  return (
    <div className={`mb-2 rounded-lg border-l-2 px-3 py-2 transition-colors duration-200 ${
      effectivelyOpen ? 'border-l-primary/30 bg-bg-warm/40' : 'border-l-transparent bg-transparent'
    }`}>
      {/* Header */}
      <button
        className="flex w-full items-center gap-2 text-xs"
        onClick={() => {
          if (!isStreaming) setIsOpen(!isOpen);
        }}
      >
        <Brain
          className={`h-3.5 w-3.5 shrink-0 ${
            isStreaming ? 'animate-pulse text-primary' : 'text-text-tertiary'
          }`}
        />
        <span className={`font-medium ${
          isStreaming ? 'text-primary' : effectivelyOpen ? 'text-text-secondary' : 'text-text-tertiary'
        }`}>
          {durationText}
        </span>
        <span className="flex-1" />
        {effectivelyOpen ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-text-tertiary" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" />
        )}
      </button>

      {/* Expanded content only */}
      {effectivelyOpen && (
        <div className={`mt-1.5 text-xs leading-relaxed text-text-secondary ${isStreaming ? 'streaming-cursor' : ''}`}>
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
