# Mint Features

## Core Modes

### Chat Mode
Direct API proxy to Anthropic-compatible providers. Supports:
- Streaming text responses via SSE
- Extended thinking (configurable token budget)
- File attachments (up to 1 MB)
- Message history persistence
- Error classification (rate limit, auth, provider, network)

### Agent Mode
Full agent orchestration using the Claude Agent SDK. Supports:
- Autonomous tool use with permission management
- Three permission modes: Bypass (auto-approve), Default (ask for dangerous), Plan (read-only)
- Auto-retry with exponential backoff and session resume
- Global 10-minute timeout with watchdog
- Sub-agent delegation (Team mode)

## Team (Multi-Agent)

Lead agent delegates tasks to specialized sub-agents:
- **code-reviewer**: Reviews code for quality and correctness
- **explorer**: Explores codebase structure and patterns
- **researcher**: Gathers information from web and docs
- **implementer**: Implements features and fixes
- **test-engineer**: Writes and runs tests

Teammate lifecycle:
1. Lead calls `Task` or `Agent` tool → `teammate_started` event
2. SDK tracks progress via `task_progress` events
3. Worker completes → `teammate_completed` event with summary
4. Auto-resume: Lead agent resumes with collected worker results

## Skills

Custom instruction sets loaded into the agent's context:
- **Builtin skills**: Located in `{cwd}/mint-skills/`
- **User skills**: Located in `~/.mint/skills/`
- Each skill is a `SKILL.md` file with YAML frontmatter (name, description, version)
- Skills can be toggled on/off, created, edited, and deleted
- Loaded into agent context via `buildSkillIndexPrompt()`

## MCP (Model Context Protocol)

External tool server integration:
- Configure MCP servers (command, args, env)
- Connection testing with latency measurement
- Tool discovery via `tools/list` JSON-RPC
- MCP tools available via `#` mention in input

## File Management

- **File tree**: Recursive directory listing (depth 3, ignore patterns)
- **File content**: Read with language detection, image/base64 support
- **File search**: By name (depth 5, max 20 results)
- **Git changes**: Staged, unstaged, and untracked file listing
- **Diff viewer**: Unified diff for any tracked file
- **File changes per thread**: Track modifications per conversation

## Rich Input (TipTap)

TipTap-based rich text editor with mention system:
- `@` → File mention (blue chip, file icon)
- `/` → Skill mention (purple chip, Zap icon)
- `#` → MCP tool mention (green chip, Wrench icon)
- Custom ProseMirror node views for each mention type
- Keyboard navigation for suggestion popups
- IME composing support (prevents premature send)
- Enter to send, Shift+Enter for newline

## Project Management

- Projects with filesystem path association
- Thread-based conversations within projects
- Session grouping and organization
- Pin/unpin sessions and projects
- Sidebar with collapsible project tree

## Session/Thread System

Two persistence models:
- **Sessions** (legacy): JSONL files, simple flat list
- **Threads** (newer): Directory-based with metadata + messages + file changes
- Both support: create, read, update, delete, list with filtering

## Settings

Configurable via UI or API:
- **Provider**: Model, API key, base URL
- **Permissions**: Bypass / Default / Plan mode
- **Skills**: Enable/disable, create, edit
- **MCP**: Add/remove/test servers

## Streaming (SSE)

Server-Sent Events transport for real-time updates:
- 14 event types: content, thinking, tool_start, tool_result, skill_load, todo_update, permission_request, plan_result, teammate_started, teammate_progress, teammate_completed, team_waiting_resume, result, error
- Client-side registry with max 5 concurrent streams
- Abort support on client disconnect

## Logging

Structured logging with ring buffer:
- In-memory buffer (2000 entries)
- JSON or pretty format
- Queryable via `/api/logs` endpoint
- Per-request loggers with request ID

## UI Features

- Dark/light theme (Tailwind CSS)
- Resizable panels (sidebar, main, right panel)
- Markdown rendering with syntax highlighting
- Diff viewer for file changes
- Code preview with language detection
- Image preview with base64 encoding
- Browser compatibility detection
- Conversation minimap for long threads
- Chinese-localized relative timestamps
