# Mint Architecture

## Overview

Mint is an AI chat/agent application built with Next.js (App Router). It supports two modes: **Chat** (direct API proxy) and **Agent** (Claude Agent SDK with orchestration, sub-agents, and permissions). All persistence is filesystem-based under `~/.mint/`.

## Directory Structure

```
src/
  app/api/          # Next.js API routes (31 endpoints)
  components/       # React UI components (~70 files)
  hooks/            # Custom React hooks (SSE parsing, streaming)
  lib/              # Core business logic
    agent-stream/   # SDK message processing pipeline
    storage/        # Filesystem persistence layer
  types/            # TypeScript type definitions
```

## Layered Architecture

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│  components/ (React) → hooks/ (SSE, streaming)  │
├─────────────────────────────────────────────────┤
│                 API Layer                        │
│  app/api/ (Next.js route handlers)               │
├─────────────────────────────────────────────────┤
│              Service Layer                       │
│  lib/agent-orchestrator → lib/agent-adapter      │
│  lib/agent-stream/ → lib/permission-store        │
│  lib/streaming-registry → lib/team-inbox-reader  │
├─────────────────────────────────────────────────┤
│              Storage Layer                       │
│  lib/storage/ (JSONL files, JSON configs)        │
├─────────────────────────────────────────────────┤
│              External APIs                       │
│  Anthropic-compatible API / Claude Agent SDK     │
└─────────────────────────────────────────────────┘
```

## Data Flow

### Chat Mode

```
User Input → POST /api/chat → Anthropic API (streaming) → SSE → Client
                                  ↓
                           Storage (JSONL append)
```

1. Client sends message to `/api/chat`
2. Server proxies to Anthropic-compatible API with streaming
3. SSE events forwarded to client in real-time
4. User and assistant messages appended to session JSONL file

### Agent Mode

```
User Input → POST /api/agent → AgentOrchestrator → Claude Agent SDK
                                      ↓                    ↓
                              processSDKMessage    canUseTool callback
                                      ↓                    ↓
                              SSE Events ←→ Client   Permission Store
                                      ↓
                              Storage (JSONL append)
```

1. Client sends message to `/api/agent`
2. `AgentOrchestrator` manages concurrency, retry, and global timeout
3. `AgentAdapter` wraps Claude Agent SDK `query()` with permission handling
4. `processSDKMessage()` routes SDK messages to specialized handlers:
   - `content-handler` → text/thinking deltas, tool start
   - `teammate-handler` → sub-agent lifecycle (started/progress/completed)
   - `tool-result-handler` → tool results, teammate completions
   - `result-handler` → final result or error
5. Auto-resume flow polls team inbox for worker results

## Key Modules

### AgentOrchestrator (`lib/agent-orchestrator.ts`)
- **Concurrency guard**: One active session per ID (synchronous `has()` + `add()`)
- **Auto-retry**: Up to 3 attempts with exponential backoff + resume support
- **Global timeout**: 10-minute hard limit
- **Watchdog**: Checks if all worker agents are idle every 5 seconds
- **Auto-resume**: Polls `~/.claude/teams/*/inboxes/team-lead.json` for worker results

### AgentAdapter (`lib/agent-adapter.ts`)
- Wraps Claude Agent SDK `query()` and `resumeQuery()`
- Manages `AbortController` for cancellation
- Implements `canUseTool` callback with permission modes

### Storage (`lib/storage/`)
- **SessionStorage**: JSONL files (`~/.mint/sessions/*.jsonl`)
- **ThreadStorage**: Directory per thread (`~/.mint/threads/{id}/`)
- **ConfigStorage**: JSON file (`~/.mint/config.json`)
- **SkillStorage**: SKILL.md files in `~/.mint/skills/`
- **MCP Config**: JSON file (`~/.mint/mcp-servers.json`)

### Streaming Registry (`lib/streaming-registry.tsx`)
- Client-side React context tracking active streams
- Max 5 concurrent streams
- Abort support for stream cancellation

## Configuration Constants

All configurable constants are centralized in `lib/constants.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `DEFAULT_MODEL` | `'glm-5.1'` | Default AI model |
| `DEFAULT_BASE_URL` | `'https://open.bigmodel.cn/api/anthropic'` | Default API endpoint |
| `MAX_TOKENS` | `4096` | Max output tokens per request |
| `THINKING_BUDGET_TOKENS` | `10000` | Token budget for extended thinking |
| `MAX_ATTACHMENT_SIZE` | `1 MB` | Max file attachment size |
| `MAX_AUTO_RETRIES` | `3` | Retry attempts for agent queries |
| `RETRY_BASE_MS` | `1000` | Base delay for retry backoff |
| `GLOBAL_TIMEOUT_MS` | `600000` | 10-minute session timeout |
| `MAX_CONCURRENT_STREAMS` | `5` | Max parallel streaming sessions |
| `PERMISSION_TIMEOUT_MS` | `60000` | 1-minute permission prompt timeout |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for the provider |
| `ANTHROPIC_BASE_URL` | Override API endpoint |
| `ANTHROPIC_AUTH_TOKEN` | Alternative API key (lower priority) |
| `MINT_CWD` | Override project working directory |
