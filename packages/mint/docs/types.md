# Type System Overview

All types live in `src/types/` and are re-exported from `src/types/index.ts`.

## Core Types

### Message (`message.ts`)

| Type | Description |
|------|-------------|
| `ChatMessage` | Full message shape: `id`, `role` (user/assistant/question/answer), `content`, `timestamp`, optional `toolCalls`, `skillLoads`, `todos`, `attachments`, `thinkingContent`, `isPlanMode`, `questionData`, `answerData`, `errorInfo`, agent metadata |
| `ToolCallInfo` | Tool execution record: `id`, `name`, `args`, `result?`, `status` (running/completed/error), timestamps |
| `SkillLoadInfo` | Skill load event: `id`, `name`, `description`, `status: 'loaded'` |
| `TodoItem` | Todo tracking: `content`, `status` (pending/in_progress/completed), `activeForm` |
| `Attachment` | File attachment: `id`, `name`, `type`, `size`, `content?` |
| `StreamEventData` | SSE wire format with all optional fields for 14 event types |
| `StreamEventType` | Union of 14 string literal event type identifiers |
| `StreamErrorCode` | `'RATE_LIMITED' \| 'AUTH_ERROR' \| 'PROVIDER_ERROR' \| 'NETWORK_ERROR' \| 'INTERNAL_ERROR'` |
| `AskQuestionItem` | Question for user: `question`, `header`, `options`, `multiSelect` |
| `PermissionRequestData` | Permission prompt: `requestId`, `toolName`, `toolUseId`, `input`, `decisionReason?` |

### Stream Events (`stream-events.ts`)

Discriminated union of 14 typed event interfaces:

| Event Type | Interface | Key Fields |
|------------|-----------|------------|
| `content` | `ContentEvent` | `data`, `isPlanMode?` |
| `thinking` | `ThinkingEvent` | `thinkingDelta` |
| `tool_start` | `ToolStartEvent` | `toolName`, `toolId`, `toolArgs` |
| `tool_result` | `ToolResultEvent` | `data`, `toolId` |
| `skill_load` | `SkillLoadEvent` | `skillName`, `skillDescription` |
| `todo_update` | `TodoUpdateEvent` | `todos: TodoItem[]` |
| `permission_request` | `PermissionRequestEvent` | `requestId`, `toolName`, `toolId`, `toolArgs` |
| `plan_result` | `PlanResultEvent` | `data` |
| `teammate_started` | `TeammateStartedEvent` | `teammate: TeammateState` |
| `teammate_progress` | `TeammateProgressEvent` | `teammate: TeammateState` |
| `teammate_completed` | `TeammateCompletedEvent` | `teammate: TeammateState` |
| `team_waiting_resume` | `TeamWaitingResumeEvent` | — |
| `result` | `ResultEvent` | `data`, `isPlanMode?` |
| `error` | `ErrorEvent` | `data`, `errorCode?` |

`StreamEvent = ContentEvent | ThinkingEvent | ... | ErrorEvent`

### Session (`session.ts`)

| Type | Description |
|------|-------------|
| `Mode` | `'chat' \| 'agent'` |
| `SessionConfig` | `model`, `systemPrompt?` |
| `SessionState` | `id`, `mode`, `messages`, `isStreaming`, `config` |
| `SessionResult` | `success`, `sessionId`, optional `error`, `costUsd`, `durationMs`, `numTurns`, `tokens` |

### Storage (`storage.ts`)

| Type | Description |
|------|-------------|
| `SessionMetadata` | `id`, `title`, `mode`, `createdAt`, `updatedAt`, `messageCount`, `model`, `pinned?`, `projectId?` |
| `SessionRecord` | Discriminated: `{ type: 'metadata', metadata } \| { type: 'message', message }` |
| `StorageAdapter` | Interface: `initialize()`, `createSession()`, `appendMessage()`, `readSession()`, `listSessions()`, `deleteSession()`, `updateSessionMetadata()` |

### Project & Thread (`project.ts`)

| Type | Description |
|------|-------------|
| `Project` | `id`, `name`, `type: 'project'`, `projectPath?`, `createdAt`, `updatedAt`, `pinned?` |
| `Thread` | `id`, `title`, `type: 'thread'`, `projectId`, `createdAt`, `updatedAt`, `messageCount`, `mode`, `model` |
| `ThreadItem` | Unified sidebar item (project or thread) with recursive `children` |
| `FileChange` | `id`, `threadId`, `filePath`, `changeType`, `additions`, `deletions`, `timestamp` |

### Group (`group.ts`)

| Type | Description |
|------|-------------|
| `SessionGroup` | `id`, `name`, `sessionIds[]`, `createdAt`, `updatedAt` |
| `Project` (group) | `id`, `name`, `projectPath`, `sessionIds[]`, `createdAt`, `updatedAt` |

Note: Two `Project` types exist. The `project.ts` version is re-exported as `ThreadProject` to disambiguate.

### Team (`team.ts`)

| Type | Description |
|------|-------------|
| `SubAgentDefinition` | `name`, `description`, `prompt`, `tools?`, `model?` (sonnet/opus/haiku/inherit) |
| `TeammateStatus` | `'running' \| 'completed' \| 'failed' \| 'stopped'` |
| `TeammateState` | Full runtime state: `taskId`, `description`, `status`, `progressDescription`, `currentToolName`, `toolHistory`, `summary`, `usage` |

### MCP (`mcp.ts`)

| Type | Description |
|------|-------------|
| `McpServerConfig` | `id`, `name`, `command`, `args[]`, `env?`, `enabled` |
| `McpConnectionTestResult` | `status`, `tools[]`, `error?`, `latencyMs` |

### Mention (`mention.ts`)

| Type | Description |
|------|-------------|
| `MentionType` | `'file' \| 'skill' \| 'mcp'` |
| `MentionChip` | `type`, `label`, `value`, `description?` |

**Runtime values:**
- `MENTION_TRIGGERS`: Regex patterns — `@` (file), `/` (skill), `#` (mcp)
- `MENTION_TOKEN`: Encode functions — `@{path}`, `/{skill}`, `#{tool}`
- `extractMentions(content)`: Parse content for all mentions
- `MENTION_COLORS`: Tailwind CSS classes per mention type
