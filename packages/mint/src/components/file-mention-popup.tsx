'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { File, Folder, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileMentionItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

interface FileMentionPopupProps {
  query: string;
  anchorRect: DOMRect | null;
  onSelect: (item: FileMentionItem) => void;
  onClose: () => void;
}

export function FileMentionPopup({ query, anchorRect, onSelect, onClose }: FileMentionPopupProps) {
  const [results, setResults] = useState<FileMentionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (!listRef.current) return;
    const buttons = listRef.current.querySelectorAll('button');
    buttons[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Debounced search — empty query loads top-level files
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query || '*';
        const res = await fetch(`/api/files/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
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
  }, [query]);

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

  // Position: aligned with anchor (input container), expand upward
  const style: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + 4,
        left: anchorRect.left + (anchorRect.width - 260) / 2,
        width: 260,
      }
    : { display: 'none' };

  return (
    <div
      ref={containerRef}
      className="z-50 rounded-xl border border-border bg-bg shadow-lg overflow-hidden"
      style={style}
    >
      {/* Header with search indicator */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-warm">
        <Search className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
        <span className="text-xs text-text-tertiary truncate">
          {loading
            ? 'Searching...'
            : query
              ? `${results.length} file${results.length !== 1 ? 's' : ''} matching "${query}"`
              : `${results.length} file${results.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-text-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-text-tertiary">No files found</div>
        ) : (
          <div ref={listRef} className="py-1">
            {results.map((item, i) => {
              const parts = item.path.split('/');
              const fileName = parts.pop() ?? item.name;
              const dirPath = parts.length > 0 ? parts.join('/') + '/' : '';
              const isDir = item.type === 'directory';

              return (
                <button
                  key={item.path}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                    i === selectedIndex
                      ? 'bg-primary/8 text-text'
                      : 'text-text-secondary hover:bg-bg-hover',
                  )}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  {isDir ? (
                    <Folder className="h-4 w-4 shrink-0 text-warning" />
                  ) : (
                    <File className="h-4 w-4 shrink-0 text-text-tertiary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn('text-xs', i === selectedIndex ? 'font-medium' : 'font-normal')}
                    >
                      {fileName}
                    </span>
                    {dirPath && (
                      <span className="text-[10px] text-text-tertiary ml-1.5">{dirPath}</span>
                    )}
                  </div>
                  {isDir && <span className="text-[10px] text-text-tertiary">/</span>}
                </button>
              );
            })}
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
