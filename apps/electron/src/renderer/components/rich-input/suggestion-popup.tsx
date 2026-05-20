
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/file-icons';
import type { MentionType } from '@/types';

export interface SuggestionItem {
  type: MentionType;
  label: string;
  value: string;
  description?: string;
}

export interface SuggestionPopupRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

interface SuggestionPopupProps {
  items: SuggestionItem[];
  command: (item: { id: string; label: string }) => void;
  type: MentionType;
  loading?: boolean;
}

export const SuggestionPopup = forwardRef<SuggestionPopupRef, SuggestionPopupProps>(
  function SuggestionPopup({ items, command, type, loading }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      if (!listRef.current) return;
      const buttons = listRef.current.querySelectorAll('button');
      buttons[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown(event: KeyboardEvent) {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          if (items.length > 0) {
            const item = items[selectedIndex];
            command({ id: item.value, label: item.label });
          }
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="z-50 rounded-xl border border-border bg-card shadow-[0_4px_16px_rgba(0,0,0,0.12)] overflow-hidden">
        <div ref={listRef} className="max-h-64 overflow-y-auto py-1 min-w-[240px]">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-text-tertiary">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-text-tertiary">No results</div>
          ) : (
            items.map((item, i) => (
              <button
                key={item.value}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors cursor-pointer',
                  i === selectedIndex
                    ? 'bg-primary-light text-text font-medium'
                    : 'text-text-secondary hover:bg-bg-warm hover:text-text',
                )}
                onClick={() => command({ id: item.value, label: item.label })}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {type === 'file'
                  ? (() => {
                      const { Icon, color } = getFileIcon(item.label);
                      return <Icon className={cn('h-4 w-4 shrink-0', color)} />;
                    })()
                  : null}
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate">{item.label}</div>
                  {type === 'file' && item.value && (
                    <div className="text-[10px] text-text-tertiary truncate">
                      {item.value.length > 40 ? '…' + item.value.slice(-38) : item.value}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  },
);
