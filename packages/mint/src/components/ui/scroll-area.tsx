'use client';

import { cn } from '@/lib/utils';
import { forwardRef, type HTMLAttributes, useEffect, useRef } from 'react';

const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const innerRef = useRef<HTMLDivElement>(null);
    const containerRef = (ref as React.RefObject<HTMLDivElement>) ?? innerRef;

    return (
      <div ref={containerRef} className={cn('overflow-y-auto', className)} {...props}>
        {children}
      </div>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';

interface AutoScrollProps extends HTMLAttributes<HTMLDivElement> {
  trigger?: unknown;
}

const AutoScrollArea = forwardRef<HTMLDivElement, AutoScrollProps>(
  ({ className, children, trigger, ...props }, ref) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mergedRef = (node: HTMLDivElement | null) => {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [trigger]);

    return (
      <div ref={mergedRef} className={cn('overflow-y-auto', className)} {...props}>
        {children}
        <div ref={bottomRef} />
      </div>
    );
  },
);
AutoScrollArea.displayName = 'AutoScrollArea';

export { ScrollArea, AutoScrollArea };
