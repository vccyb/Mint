import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  const [selected, setSelected] = useState<string | null>(null);

  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pl-3">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => {
            setSelected(text);
            onSelect(text);
          }}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs border transition-colors cursor-pointer',
            selected === text
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-bg-warm/60 border-border text-text-secondary hover:bg-bg-hover hover:border-border-hover',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
