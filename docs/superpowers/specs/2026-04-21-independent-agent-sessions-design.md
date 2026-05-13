# Independent Agent Sessions with Background Streaming

## Problem

Mint's agent mode uses a single `useChatStream` hook per mode, tracking only one active session. When users switch sessions during streaming, the "thinking" indicator appears on the wrong session. There is no concept of independent sessions or background execution.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Background execution | Yes — switch sessions while agent runs in background |
| Max concurrent | 5 agent sessions simultaneously |
| Status indicator | Left side of session title: spinner (running) → check (completed, fades after 3s) |
| Architecture | StreamingRegistry (lightweight state registry, not message store) |
| Message management | Remains in `useChatStream`, refactored to `Map<sessionId, messages[]>` |

## Architecture

### StreamingRegistry

A lightweight singleton that tracks streaming status per session, exposed via React Context.

```
StreamingRegistry
├── statuses: Map<string, { isStreaming: boolean; mode: Mode }>
├── abortControllers: Map<string, AbortController>
├── MAX_CONCURRENT = 5
│
├── register(sessionId, mode, abortController)
├── complete(sessionId)
├── abort(sessionId)
├── getStatus(sessionId) → { isStreaming, mode } | undefined
├── getActiveCount() → number
├── canStartNew() → boolean
├── getAllStatuses() → Map<string, StreamStatus>
└── subscribe(listener) → unsubscribe
```

React hooks:
- `useStreamingRegistry()` — access registry instance
- `useStreamStatuses()` — `useSyncExternalStore` returning status map (minimal re-renders)

### Sidebar Status Display

Session items render left-to-right: `[status] [icon] [title] [delete]`

- Agent running → blue `Loader2` spinner
- Agent completed → green `Check` (fades after 3 seconds)
- No active stream → empty space (same width for alignment)
- Chat sessions → no status indicator

### useChatStream Refactor

State changes:
- `messages: ChatMessage[]` → `messagesMap: Map<string, ChatMessage[]>`
- `isStreaming: boolean` → derived from `registry.getStatus(activeSessionId)`
- `sessionId: string | null` → `activeSessionId: string | null`

Key behavioral changes:
- `loadSession()` saves current messages to map, loads target session, does NOT abort other streams
- `sendMessage()` checks `registry.canStartNew()` before sending
- SSE handlers update `messagesMap` by sessionId, not just active session
- Background streams continue updating their map entries; on completion, save to storage

### Concurrency Limit

When `registry.getActiveCount() >= 5`:
- Send button disabled
- Error message shown: "最多同时执行 5 个 Agent 任务，请等待完成后再试"

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Memory pressure from multiple sessions | Registry only stores status, not messages. Messages in map freed when session closed. |
| React re-render storms | `useSyncExternalStore` per-session subscription, not full Context value |
| Race conditions on session switch | SSE handlers verify sessionId before updating state |
| Large refactor scope | Split into Phase 1 (Registry + sidebar) and Phase 2 (useChatStream refactor) |

## Files

| File | Operation | Description |
|------|-----------|-------------|
| `packages/mint/src/lib/streaming-registry.tsx` | New | Registry class, Provider, hooks |
| `packages/mint/src/hooks/use-chat-stream.ts` | Modify | Multi-session map, Registry integration |
| `packages/mint/src/components/mint-app.tsx` | Modify | Wrap with Provider, pass concurrency status |
| `packages/mint/src/components/session-sidebar.tsx` | Modify | Left-side status indicators |
| `packages/mint/src/components/message-input.tsx` | Modify | Concurrency limit UI |
