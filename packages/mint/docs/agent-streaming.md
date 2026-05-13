# Agent Streaming

## Overview

The agent streaming system transforms raw Claude Agent SDK messages into typed SSE events for real-time delivery to the client. It consists of a message router (`processSDKMessage`) and four specialized handlers.

## Module Structure

```
src/lib/agent-stream/
  index.ts              # Barrel exports + processSDKMessage router
  session-context.ts    # SessionStreamState (mutable session state)
  content-handler.ts    # handleStreamEvent (text/thinking/tools)
  teammate-handler.ts   # handleSystemMessage (sub-agent lifecycle)
  tool-result-handler.ts # handleUserMessage (tool results)
  result-handler.ts     # handleResultMessage (final result/error)
  skill-utils.ts        # Utility functions (parse, extract, build index)
```

## Message Router

`processSDKMessage(sdkMessage, state, enqueue)` routes by `sdkMessage.type`:

| SDK Message Type | Handler | Description |
|-----------------|---------|-------------|
| `stream_event` | `handleStreamEvent` | Text/thinking deltas, tool use start/input/complete |
| `system` | `handleSystemMessage` | SDK init, task lifecycle (started/progress/notification) |
| `user` | `handleUserMessage` | Tool results, teammate completions |
| `result` | `handleResultMessage` | Final result or error |

## SessionStreamState

Mutable state object tracking a single agent session:

- **Content**: `assistantContent`, `thinkingContent` (accumulated strings)
- **Tool parsing**: Current tool name, args buffer, tool calls list
- **Tool sets**: `todoWriteToolIds`, `taskToolIds`, `startedTaskIds`
- **Teammate tracking**: `teammateIndexMap`, `teammateStartTimes`, `teammateDescriptions`, `teammateToolHistories`, `teammatePrompts`
- **Bridge data**: For content-handler to teammate-handler communication
- **Session ID**: `capturedSdkSessionId` (for auto-resume)
- **Deferred result**: Held when teammates are still active
- **Summaries**: `taskNotificationSummaries` (for auto-resume fallback)
- **Todos**: `latestTodos`
- **Skills**: `skillPathMap`, `skillLoads`

## Handler Pipeline

### content-handler (`handleStreamEvent`)

Processes `stream_event` messages from the SDK:

1. **Text delta** (`content_block_delta` + `text_delta`) → emit `content` SSE event
2. **Thinking delta** (`thinking_delta`) → emit `thinking` SSE event
3. **Tool use start** (`content_block_start` + `tool_use`) → capture tool name/ID
4. **Tool input delta** → accumulate JSON args
5. **Tool complete** (`content_block_stop`) →
   - `TodoWrite` → emit `todo_update` event
   - `Task`/`Agent` → create teammate + emit `teammate_started` + `tool_start`
   - Skill read → emit `skill_load`
   - Regular tool → emit `tool_start`

### teammate-handler (`handleSystemMessage`)

Processes `system` messages:

1. **init** → capture SDK session ID
2. **task_started** → bridge `toolUseId` to real `taskId`, create/update teammate
3. **task_progress** → update teammate with tool history, elapsed time
4. **task_notification** → mark teammate completed with summary and usage stats
   - Deduplicates completions between `task_notification` and `tool_result`

### tool-result-handler (`handleUserMessage`)

Processes `user` messages (tool_result blocks):

1. Skip TodoWrite results (silent)
2. **Task/Agent results** → emit `teammate_completed` with summary, collect for auto-resume
3. Update tool call status (running → completed/error)

### result-handler (`handleResultMessage`)

Processes `result` messages:

1. Capture SDK session ID for auto-resume
2. Classify errors (skip if teammates completed successfully)
3. **Defer result** if teammates are still active (result emitted after all complete)

## SSE Event Types

14 event types emitted by the handlers:

| Event | Emitted By | Data |
|-------|-----------|------|
| `content` | content-handler | `data: string` |
| `thinking` | content-handler | `thinkingDelta: string` |
| `tool_start` | content-handler | `toolName, toolId, toolArgs` |
| `tool_result` | tool-result-handler | `data, toolId` |
| `skill_load` | content-handler | `skillName, skillDescription` |
| `todo_update` | content-handler | `todos: TodoItem[]` |
| `permission_request` | AgentAdapter | `requestId, toolName, toolArgs` |
| `plan_result` | result-handler | `data` |
| `teammate_started` | content-handler | `teammate: TeammateState` |
| `teammate_progress` | teammate-handler | `teammate: TeammateState` |
| `teammate_completed` | tool-result-handler | `teammate: TeammateState` |
| `team_waiting_resume` | AgentOrchestrator | — |
| `result` | result-handler | `data, isPlanMode?` |
| `error` | Any handler | `data, errorCode?` |

## Orchestrator Lifecycle

The `AgentOrchestrator` manages the full session lifecycle:

1. **Concurrency guard**: `has()` + `add()` synchronous check (single-threaded guarantee)
2. **Global timeout**: 10-minute abort via `AbortController`
3. **Client disconnect**: Propagates HTTP abort signal to SDK abort
4. **SDK iteration**: `consumeSDKIterator()` races between:
   - Next SDK message
   - Abort signal
   - Stall detection (30s normal, 120s with active teammates)
5. **Watchdog**: Every 5s checks if all workers are idle → abort main loop
6. **Auto-resume**: After main loop, polls team inbox for worker results
7. **Finalize**: Marks remaining teammates as stopped, saves assistant message

## Auto-Resume Flow

After the main SDK loop completes with active teammates:

1. Find team lead inbox at `~/.claude/teams/{sessionId}/inboxes/team-lead.json`
2. Poll inbox with retry for unread messages
3. If messages found → resume SDK session with formatted prompt
4. Fallback → use `taskNotificationSummaries` as resume prompt
5. Stream resume response as regular content events
6. Save resume response as additional assistant message
