import type { StreamEventData } from '@/types';

/**
 * Parse SSE buffer into individual events.
 * Extracted from the duplicated logic in use-chat-stream.ts's sendMessage and approvePlan.
 */
export function parseSSEBuffer(buffer: string): {
  events: StreamEventData[];
  remaining: string;
} {
  const parts = buffer.split('\n\n');
  const remaining = parts.pop() ?? '';
  const events: StreamEventData[] = [];

  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        events.push(JSON.parse(raw) as StreamEventData);
      } catch {
        /* skip malformed events */
      }
    }
  }

  return { events, remaining };
}
