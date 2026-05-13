# Storage Layer

## Overview

Mint uses a filesystem-based persistence layer with no database. All data is stored under `~/.mint/` (configurable via `MINT_CWD` environment variable).

## Directory Structure

```
~/.mint/
  config.json              # Application configuration
  sessions/                # Session JSONL files
    {sessionId}.jsonl
  threads/                 # Thread directories
    {threadId}/
      metadata.json        # Thread metadata
      messages.jsonl       # Message history
  file-changes/            # File change records
    {threadId}.json
  agent-groups.json        # Session groups
  agent-projects.json      # Project definitions
  mcp-servers.json         # MCP server configs
  skills/                  # Active user skills
    {skillName}/SKILL.md
  skills-inactive/         # Inactive user skills
    {skillName}/SKILL.md
```

## StorageAdapter Interface

Defined in `src/types/storage.ts`:

```typescript
interface StorageAdapter {
  initialize(): Promise<void>;
  createSession(metadata: SessionMetadata): Promise<void>;
  appendMessage(sessionId: string, message: ChatMessage): Promise<void>;
  readSession(sessionId: string): Promise<{ messages: ChatMessage[] }>;
  listSessions(): Promise<SessionMetadata[]>;
  deleteSession(sessionId: string): Promise<void>;
  updateSessionMetadata(sessionId: string, partial: Record<string, unknown>): Promise<void>;
}
```

Implemented by `FileSystemStorage` in `src/lib/storage/index.ts`.

## JSONL File Format

Session files use JSON Lines format — one JSON object per line:

```jsonl
{"type":"metadata","id":"sess_xxx","title":"新对话","mode":"chat","createdAt":1715000000000,"updatedAt":1715000000000,"messageCount":0,"model":"glm-5.1"}
{"type":"message","id":"msg_xxx","role":"user","content":"Hello","timestamp":1715000001000}
{"type":"message","id":"msg_yyy","role":"assistant","content":"Hi there!","timestamp":1715000002000}
```

- First line is always a **metadata** record
- Subsequent lines are **message** records
- Append-only writes (new messages go to end of file)
- `updateMetadata()` rewrites the entire file with merged metadata

## Sub-Storages

### ConfigStorage (`storage/config.ts`)
- File: `~/.mint/config.json`
- Read/write JSON config
- Default values from `lib/constants.ts`

### SessionStorage (`storage/session.ts`)
- Files: `~/.mint/sessions/*.jsonl`
- CRUD operations with pinned-first sorting
- `list()` returns sessions sorted: pinned first, then by `updatedAt` descending

### ThreadStorage (`storage/thread.ts`)
- Dirs: `~/.mint/threads/{id}/`
- Each thread has `metadata.json` + `messages.jsonl`
- File changes stored separately in `~/.mint/file-changes/{id}.json`
- Supports: `create`, `appendMessage`, `readMessages`, `addFileChange`, `getFileChanges`, `clearFileChanges`

### GroupStorage (`storage/group.ts`)
- File: `~/.mint/agent-groups.json`
- Array of `SessionGroup` objects
- `moveSessionToGroup()`, `removeSessionFromGroup()`

### ProjectStorage (`storage/project.ts`)
- File: `~/.mint/agent-projects.json`
- Array of `Project` objects with `sessionIds[]`
- `moveSessionToProject()`, `removeSessionFromProject()`

### SkillStorage (`storage/skills.ts`)
- Paths:
  - Builtin: `{cwd}/mint-skills/`
  - Active user: `~/.mint/skills/`
  - Inactive: `~/.mint/skills-inactive/`
- Each skill is a `SKILL.md` file with YAML frontmatter

### MCP Config (`storage/mcp-config.ts`)
- File: `~/.mint/mcp-servers.json`
- Array of `McpServerConfig` objects
- `addMcpServer()`, `removeMcpServer()`, `toggleMcpServer()`

## Singleton Factory

```typescript
import { getStorage } from '@/lib/storage';

const storage = getStorage(); // returns FileSystemStorage singleton
await storage.initialize();
```

The `getStorage(projectRoot?)` function creates a singleton `FileSystemStorage` instance. The data directory defaults to `~/.mint/` but can be overridden via `MINT_CWD`.
