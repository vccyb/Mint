'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  children: [React.ReactNode, React.ReactNode];
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  showDivider?: boolean;
}

export function ResizablePanel({
  children,
  defaultLeftWidth = 60,
  minLeftWidth = 30,
  maxLeftWidth = 80,
  showDivider = true,
}: ResizablePanelProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset width when defaultLeftWidth changes (e.g. toggling file panel)
  useEffect(() => {
    setLeftWidth(defaultLeftWidth);
  }, [defaultLeftWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(maxLeftWidth, Math.max(minLeftWidth, percent));
      setLeftWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minLeftWidth, maxLeftWidth]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 flex-row min-h-0 ${isDragging ? 'select-none' : ''}`}
    >
      <div style={{ width: `${leftWidth}%` }} className="flex min-h-0 min-w-0">
        {children[0]}
      </div>

      {/* Divider */}
      {showDivider && (
        <div
          onMouseDown={handleMouseDown}
          className={`w-1 shrink-0 cursor-col-resize transition-colors ${
            isDragging ? 'bg-primary/20' : 'bg-border hover:bg-border-hover'
          }`}
        />
      )}
      <div className="flex flex-1 min-h-0 min-w-0">{children[1]}</div>
    </div>
  );
}
