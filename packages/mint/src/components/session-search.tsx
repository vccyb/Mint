'use client';

import { useCallback } from 'react';

interface SessionSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function SessionSearch({ value, onChange }: SessionSearchProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <div className="px-2.5 pb-1.5">
      <div className="flex items-center gap-1.5 rounded-[6px] border border-border bg-bg px-2 py-[5px] transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-text-tertiary"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="搜索对话..."
          className="flex-1 border-none bg-transparent text-[11px] text-text outline-none placeholder:text-text-tertiary"
        />
      </div>
    </div>
  );
}
