
import { useState, useLayoutEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types';

interface ConversationMinimapProps {
  messages: ChatMessage[];
}

export function ConversationMinimap({ messages }: ConversationMinimapProps) {
  const userMessages = messages.filter((m) => m.role === 'user');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const computeActive = useCallback(() => {
    const wrapper = document.querySelector('[data-message-list]');
    const scrollEl = wrapper?.querySelector('.overflow-y-auto') as HTMLElement;
    if (!scrollEl) return;

    const viewMid = scrollEl.scrollTop + scrollEl.clientHeight / 2;

    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < userMessages.length; i++) {
      const el = document.getElementById(`msg-${userMessages[i].id}`);
      if (!el) continue;
      const elMid = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(elMid - viewMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    setActiveIdx(bestIdx);
  }, [userMessages]);

  useLayoutEffect(() => {
    computeActive();
    const wrapper = document.querySelector('[data-message-list]');
    const scrollEl = wrapper?.querySelector('.overflow-y-auto');
    if (scrollEl) {
      scrollEl.addEventListener('scroll', computeActive);
      return () => scrollEl.removeEventListener('scroll', computeActive);
    }
  }, [computeActive]);

  // Don't collapse when hovering tooltip / clicking inside
  const keepExpanded = useCallback(() => {
    setExpanded(true);
  }, []);

  if (userMessages.length < 2) return null;

  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      ref={panelRef}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`absolute right-3 top-3 z-10 rounded-md border border-border/60 bg-bg/90 backdrop-blur-sm shadow-elevation-1 transition-all duration-150 overflow-hidden ${
        expanded ? 'w-44 py-1.5 px-1' : 'w-7 py-2 px-1.5 flex flex-col items-center gap-[3px]'
      }`}
    >
      {userMessages.map((msg, idx) =>
        expanded ? (
          <button
            key={msg.id}
            onClick={() => scrollToMessage(msg.id)}
            onMouseEnter={keepExpanded}
            className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] truncate transition-colors cursor-pointer ${
              idx === activeIdx
                ? 'bg-primary/15 text-primary font-medium'
                : 'text-text-tertiary hover:bg-bg-warm hover:text-text-secondary'
            }`}
          >
            {msg.content.slice(0, 60) || '...'}
          </button>
        ) : (
          <button
            key={msg.id}
            onClick={() => scrollToMessage(msg.id)}
            className={`block h-[2px] rounded-full transition-colors cursor-pointer ${
              idx === activeIdx ? 'w-4 bg-primary' : 'w-3 bg-text-tertiary/30'
            }`}
          />
        ),
      )}
    </div>
  );
}
