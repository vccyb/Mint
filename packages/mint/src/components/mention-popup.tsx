'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { File, Zap, Wrench, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MentionType, MentionChip } from '@/types';

interface MentionPopupProps {
  type: MentionType;
  query: string;
  anchorRect: DOMRect | null;
  onSelect: (item: MentionChip) => void;
  onClose: () => void;
}

const TYPE_CONFIG: Record<MentionType, { icon: typeof File; label: string; accent: string }> = {
  file: { icon: File, label: 'Files', accent: 'text-primary' },
  skill: { icon: Zap, label: 'Skills', accent: 'text-purple-600' },
  mcp: { icon: Wrench, label: 'MCP Tools', accent: 'text-green-600' },
};

const API_ENDPOINTS: Record<MentionType, string> = {
  file: '/api/files/search',
  skill: '/api/skills/search',
  mcp: '/api/tools/mcp/search',
};

export function MentionPopup({ type, query, anchorRect, onSelect, onClose }: MentionPopupProps) {
  const [results, setResults] = useState<MentionChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const config = TYPE_CONFIG[type];
  const TypeIcon = config.icon;

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!listRef.current) return;
    const buttons = listRef.current.querySelectorAll('button');
    buttons[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Debounced search
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const endpoint = API_ENDPOINTS[type];
        const q = query || '*';
        const res = await fetch(
          `${endpoint}?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          if (type === 'file') {
            const raw = data.results ?? [];
            setResults(raw.map((r: { name: string; path: string; type: string }) => ({
              type: 'file' as const,
              label: r.name,
              value: r.path,
              description: r.type === 'directory' ? 'Directory' : undefined,
            })));
          } else {
            setResults(data.results ?? []);
          }
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, query]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        onSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, onSelect, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [handleKeyDown]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + 4,
        left: anchorRect.left,
        width: anchorRect.width,
      }
    : { display: 'none' };

  return (
    <div
      ref={containerRef}
      className="z-50 rounded-xl border border-border bg-bg shadow-lg overflow-hidden"
      style={style}
    >
      {/* Header */}
      <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-warm')}>
        <TypeIcon className={cn('h-3.5 w-3.5 shrink-0', config.accent)} />
        <span className="text-xs text-text-tertiary truncate">
          {loading
            ? 'Searching...'
            : query
              ? `${results.length} result${results.length !== 1 ? 's' : ''} matching "${query}"`
              : `${results.length} ${config.label.toLowerCase()}`}
        </span>
      </div>

      {/* Results list */}
      <div className="max-h-64 overflow-y-auto">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-text-tertiary">
            No {config.label.toLowerCase()} found
          </div>
        ) : (
          <div ref={listRef} className="py-1">
            {results.map((item, i) => (
              <button
                key={item.value}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                  i === selectedIndex
                    ? 'bg-primary/8 text-text'
                    : 'text-text-secondary hover:bg-bg-hover',
                )}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <TypeIcon className={cn('h-4 w-4 shrink-0', config.accent)} />
                <div className="min-w-0 flex-1">
                  <span className={cn(
                    'text-xs',
                    i === selectedIndex ? 'font-medium' : 'font-normal',
                  )}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-[10px] text-text-tertiary ml-1.5 truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-border bg-bg-warm text-[10px] text-text-tertiary flex items-center gap-3">
        <span>↑↓ navigate</span>
        <span>↵ select</span>
        <span>esc close</span>
      </div>
    </div>
  );
}
