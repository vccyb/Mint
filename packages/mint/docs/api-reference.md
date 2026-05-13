# API Reference

All endpoints are under `/api/`. Request/response bodies are JSON unless noted.

---

## Config

### GET /api/config
Read application configuration.

**Response:** `{ model, apiKey?, baseUrl?, skillsEnabled?, permissionMode? }`

### POST /api/config
Update application configuration.

**Body:** `{ model?, apiKey?, baseUrl?, skillsEnabled?, permissionMode? }`

**Response:** `{ ...updatedConfig }`

---

## Sessions

### GET /api/sessions
List sessions, optionally filtered by mode.

**Query:** `?mode=chat|agent`

**Response:** `SessionMetadata[]`

### POST /api/sessions
Create a new session.

**Body:** `{ mode?: 'chat'|'agent', projectId?, title? }`

**Response:** `{ id, title, mode, createdAt, updatedAt, messageCount, model }`

### GET /api/sessions/:id
Get session with full message history.

**Response:** `{ id, title, messages: ChatMessage[], ... }`

### PATCH /api/sessions/:id
Update session metadata.

**Body:** `{ title?, messageCount?, ... }`

**Response:** `{ success: true }`

### DELETE /api/sessions/:id
Delete a session.

**Response:** `{ success: true }`

---

## Threads

### GET /api/threads
List threads, optionally filtered by project.

**Query:** `?projectId=string` (pass `'null'` for ungrouped)

**Response:** `{ threads: Thread[] }`

### POST /api/threads
Create a new thread.

**Body:** `{ title: string, projectId?, mode?: 'chat'|'agent', model? }`

**Response:** `{ thread: Thread }`

### GET /api/threads/:id
Get thread with messages and file changes.

**Response:** `{ thread, messages: ChatMessage[], fileChanges: FileChange[] }`

### PATCH /api/threads/:id
Update thread properties.

**Body:** `{ title?, ... }`

**Response:** `{ thread: Thread }`

### DELETE /api/threads/:id
Delete a thread.

**Response:** `{ success: true }`

### POST /api/threads/:id
Append a message to the thread.

**Body:** `ChatMessage` object

**Response:** `{ success: true }`

### GET /api/threads/:id/changes
Get file changes for a thread.

**Response:** `{ changes: FileChange[] }`

### POST /api/threads/:id/changes
Add a file change record.

**Body:** `{ filePath, changeType, additions?, deletions? }`

**Response:** `{ change: FileChange }`

### DELETE /api/threads/:id/changes
Clear all file changes for a thread.

**Response:** `{ success: true }`

---

## Projects

### GET /api/projects
List all projects.

**Response:** `{ projects: Project[] }`

### POST /api/projects
Create a project.

**Body:** `{ name: string, projectPath? }`

**Response:** `{ project: Project }`

### PATCH /api/projects/:id
Update a project.

**Body:** `{ name?, projectPath?, ... }`

**Response:** `{ project: Project }`

### DELETE /api/projects/:id
Delete a project and its sessions.

**Response:** `{ success: true }`

---

## Groups

### GET /api/groups
List all session groups.

**Response:** `{ groups: SessionGroup[] }`

### POST /api/groups
Create a group.

**Body:** `{ name: string }`

**Response:** `{ group: SessionGroup }`

### PATCH /api/groups
Remove session from its group.

**Body:** `{ sessionId: string }`

**Response:** `{ success: true }`

### PATCH /api/groups/:id
Update group or move session into it.

**Body:** `{ moveSession?: sessionId }` or `{ ...groupFields }`

**Response:** `{ success: true }`

### DELETE /api/groups/:id
Delete a group.

**Response:** `{ success: true }`

---

## Chat

### POST /api/chat
Send a message and receive an SSE stream (Chat mode).

**Body:** `{ message: string, sessionId?, attachments?: Attachment[], enableThinking? }`

**Response:** `text/event-stream` — SSE stream with events: `content`, `thinking`, `result`, `error`

---

## Agent

### POST /api/agent
Send a message and receive an SSE stream (Agent mode).

**Body:** `{ message: string, sessionId?, attachments?: Attachment[], mentionedTools?, permissionMode?, planApproval?, projectId? }`

**Response:** `text/event-stream` — SSE stream with 14 event types (see `types/stream-events.ts`)

### POST /api/agent/answer
Resolve a pending permission request.

**Body:** `{ requestId: string, behavior: 'allow'|'deny', message?, updatedInput? }`

**Response:** `{ ok: boolean }`

---

## Skills

### GET /api/skills
List all skills (builtin + user, active + inactive).

**Response:** `{ skills: Skill[] }`

### POST /api/skills/create
Create a user skill.

**Body:** `{ name: string, description: string, content: string }`

**Response:** `{ skill: Skill }`

### POST /api/skills/toggle
Toggle skill enabled/disabled.

**Body:** `{ name: string }`

**Response:** `{ name, enabled: boolean }`

### GET /api/skills/search
Search skills for mention autocomplete.

**Query:** `?q=searchTerm` (use `*` for all)

**Response:** `{ results: Array<{ type: 'skill', label, value, description }> }`

### GET /api/skills/:name/content
Get skill content.

**Response:** `{ content: string, level: 'builtin'|'user' }`

### PUT /api/skills/:name/content
Update skill content.

**Body:** `{ content: string }`

**Response:** `{ ok: true }`

### DELETE /api/skills/:name
Delete a skill.

**Response:** `{ ok: true }`

### POST /api/skills/:name/open
Open skill file in system editor.

**Response:** `{ ok: true }`

---

## Tools

### GET /api/tools
List available tools by category.

**Response:** `{ tools: Array<{ name, category: 'native'|'sdk'|'mcp', description }> }`

### GET /api/tools/mcp/search
Search MCP tools for mention autocomplete.

**Query:** `?q=searchTerm`

**Response:** `{ results: Array<{ type, label, value, description }> }`

---

## MCP

### GET /api/mcp/config
List MCP server configurations.

**Response:** `{ configs: McpServerConfig[] }`

### POST /api/mcp/config
Add an MCP server.

**Body:** `{ name: string, command: string, args?: string[], env?: Record<string, string> }`

**Response:** `{ config: McpServerConfig }`

### DELETE /api/mcp/config
Remove an MCP server.

**Query:** `?id=serverId`

**Response:** `{ ok: true }`

### PATCH /api/mcp/config
Toggle MCP server enabled/disabled.

**Body:** `{ id: string }`

**Response:** `{ ok: true }`

### POST /api/mcp/test
Test MCP server connection.

**Body:** `{ command: string, args?: string[], env?: Record<string, string> }`

**Response:** `{ status: 'connected'|'error', tools: Array<{ name, description }>, error?, latencyMs }`

---

## Files

### GET /api/files
Get file tree for project.

**Query:** `?projectId=string`

**Response:** `{ root: string, projectName: string, tree: FileNode[] }`

### GET /api/files/content
Read file content.

**Query:** `?path=filePath&projectId=string`

**Response (text):** `{ path, name, content, language, size }`
**Response (image):** `{ path, name, content, encoding: 'base64', mimeType, size }`

### GET /api/files/search
Search files by name.

**Query:** `?q=searchTerm&projectId=string`

**Response:** `{ results: Array<{ name, path, type: 'file'|'directory' }> }` (max 20)

### GET /api/files/changes
Get git file changes.

**Query:** `?projectId=string`

**Response:** `{ files: Array<{ path, status: 'added'|'modified'|'deleted'|'untracked'|'renamed' }> }`

### GET /api/files/diff
Get file diff.

**Query:** `?path=filePath&projectId=string`

**Response:** `text/plain` (unified diff)

---

## Filesystem

### GET /api/filesystem
Browse directories for path selection.

**Query:** `?dir=directoryPath` (defaults to home)

**Response:** `{ currentPath, parentPath, entries: Array<{ name, path, isDirectory }> }`

---

## Logs

### GET /api/logs
Retrieve log entries or statistics.

**Query:** `?path=stats` for stats, otherwise `?sessionId&scope&level=debug|info|warn|error&limit&offset`

**Response:** Log entries or statistics object
