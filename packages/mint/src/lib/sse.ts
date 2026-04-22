import type { StreamEventData } from '@/types';

/**
 * Encode a single SSE event from typed data.
 */
export function encodeSSE(event: StreamEventData): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create a standard SSE Response with proper headers.
 */
export function createSSEResponse(body: ReadableStream): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
