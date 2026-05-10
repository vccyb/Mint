import { createLogger } from '@/lib/logger';
import type { StreamEvent } from '@/types/stream-events';

type EventHandler<T extends StreamEvent> = (event: T) => void;
type AnyEventHandler = (event: StreamEvent) => void;

/**
 * Session-scoped synchronous event bus.
 *
 * Inspired by Proma's AgentEventBus but simplified for Mint's SSE transport.
 * Each agent request creates a new instance; disposed when the stream closes.
 */
export class AgentEventBus {
  private handlers = new Map<StreamEvent['type'], Set<EventHandler<any>>>();
  private anyHandlers = new Set<AnyEventHandler>();
  private disposed = false;
  private log = createLogger('lib.agent-event-bus');

  /** Emit an event to all registered type-specific and catch-all handlers. */
  emit(event: StreamEvent): void {
    if (this.disposed) {
      this.log.warn('emit called on disposed bus', { type: event.type });
      return;
    }
    const typed = this.handlers.get(event.type);
    if (typed) {
      for (const handler of typed) {
        try {
          handler(event);
        } catch (err) {
          this.log.error('typed handler error', { type: event.type, error: String(err) });
        }
      }
    }
    for (const handler of this.anyHandlers) {
      try {
        handler(event);
      } catch (err) {
        this.log.error('anyHandler error', { type: event.type, error: String(err) });
      }
    }
  }

  /** Register a handler for a specific event type. */
  on<T extends StreamEvent['type']>(
    type: T,
    handler: EventHandler<Extract<StreamEvent, { type: T }>>,
  ): void {
    if (this.disposed) return;
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
  }

  /** Unregister a type-specific handler. */
  off<T extends StreamEvent['type']>(
    type: T,
    handler: EventHandler<Extract<StreamEvent, { type: T }>>,
  ): void {
    this.handlers.get(type)?.delete(handler);
  }

  /** Register a catch-all handler that receives every emitted event. */
  onAny(handler: AnyEventHandler): void {
    if (this.disposed) return;
    this.anyHandlers.add(handler);
  }

  /** Unregister a catch-all handler. */
  offAny(handler: AnyEventHandler): void {
    this.anyHandlers.delete(handler);
  }

  /** Dispose the bus — clears all handlers and rejects further registrations. */
  dispose(): void {
    this.disposed = true;
    this.handlers.clear();
    this.anyHandlers.clear();
  }
}
