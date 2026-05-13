# Feature Gap Analysis — Mint vs Proma vs Craft

_Last updated: 2026-04-20_

## Priority Matrix

| Feature | Mint | Proma | Craft | Value | Priority | Effort |
|---------|------|-------|-------|-------|----------|--------|
| AskUserQuestion + Permission Control | Done | Yes | Yes | ★★★★★ | P0 | M |
| @ File Mentions | Done | Yes | No | ★★★★ | P1 | M |
| Tool Activity Enhancement (timing, intent) | Basic | Rich | Rich | ★★★★ | P1 | M |
| Permission Mode Selector | No | Yes | Yes | ★★★ | P1 | S |
| Loading Indicators with elapsed time | No | Yes | Yes | ★★★ | P1 | S |
| Session Resume via SDK | No | Yes | Yes | ★★★ | P1 | M |
| Rich Text Input (Tiptap) | Infra | Yes | Full | ★★★ | P2 | L |
| Token/Cost Tracking | No | Yes | Yes | ★★ | P2 | M |
| Code Block Copy Button | No | Yes | Yes | ★★ | P2 | S |
| Diff View for file edits | No | Yes | Yes | ★★★ | P2 | L |
| Markdown Enhancement (Mermaid, LaTeX) | Basic | Rich | Rich | ★★★ | P3 | L |
| Custom MCP Servers | No | Yes | Yes | ★★★ | P3 | L |
| Agent Teams / Subagents | No | Yes | Partial | ★★★ | P3 | XL |

## Detailed Analysis

### P0 — Critical (Already Implemented)

#### AskUserQuestion + Permission Control
- **Status**: Implemented via SSE `permission_request` event + `canUseTool` callback + answer endpoint
- **Pattern**: Server pauses agent via Promise store → client renders banner → user answers → POST resolves promise
- **Reference**: `参考项目/claude-agent-sdk-master-main/04-agent-teams/`

### P1 — High Priority

#### @ File Mentions
- **Status**: Implemented — `/api/files/search` endpoint + `FileMentionPopup` + textarea integration
- **UX**: Type `@` → popup with debounced search → select → `@{path}` inserted → content fetched on send

#### Tool Activity Enhancement
- **Current**: Shows tool name, args, status, truncated result
- **Gap**: No timing info (started/completed/elapsed), no intent description, no expand/collapse for large results
- **Proposal**: Add `startedAt`/`completedAt` timestamps, show elapsed time badge, add "Show more" for long results

#### Permission Mode Selector
- **Current**: Hardcoded `bypassPermissions`
- **Gap**: Users cannot choose permission mode (default/plan/bypass)
- **Proposal**: Add mode selector in settings or per-session, map to SDK `permissionMode` option

#### Loading Indicators
- **Current**: Streaming cursor only
- **Gap**: No elapsed time display, no activity summary during long operations
- **Proposal**: Add timer in streaming indicator, show "Agent is working..." with elapsed seconds

#### Session Resume
- **Current**: Sessions stored but not resumable via SDK `resume` option
- **Gap**: New conversation starts fresh each time
- **Proposal**: Pass `resume: sessionId` to SDK `query()` options for continuation

### P2 — Medium Priority

#### Rich Text Input
- **Current**: Plain textarea with Tiptap infrastructure available
- **Gap**: No actual rich text editing
- **Proposal**: Integrate `TiptapEditor` component into message-input, handle bold/italic/code shortcuts
- **Note**: Must preserve IME composition support and @ mention integration

#### Token/Cost Tracking
- **Current**: No tracking
- **Gap**: Users have no visibility into API costs
- **Proposal**: Parse SDK result metadata for `costUsd`, `tokens`, `durationMs`; display in session header

#### Code Block Copy Button
- **Current**: Markdown rendered code blocks without copy
- **Proposal**: Add copy button to code blocks in `MarkdownRenderer`

#### Diff View
- **Current**: Tool results show raw text
- **Gap**: File edit results should render as diff
- **Proposal**: Detect unified diff format in tool results, render with syntax highlighting

### P3 — Future

#### Markdown Enhancement
- **Current**: Basic markdown via `react-markdown`
- **Proposal**: Add Mermaid diagram rendering, LaTeX math, tables with styling

#### Custom MCP Servers
- **Current**: No MCP support
- **Proposal**: Allow users to configure MCP servers in settings, pass to SDK `mcpServers` option

#### Agent Teams / Subagents
- **Current**: Single agent only
- **Proposal**: Support multi-agent patterns with sub-agent spawning, shared context, team coordination

## Architecture Alignment

Current Mint architecture supports incremental feature addition:

```
Types → Config → Permission Store → API Routes → Hooks → Components
```

All P1-P2 features can be added without architectural changes by:
1. Extending `StreamEventType` for new SSE events
2. Adding new API routes under `/api/`
3. Adding new state to `useChatStream` hook
4. Creating new UI components

## Recommended Execution Order

1. Loading indicators + elapsed time (S effort, high visibility)
2. Permission mode selector (S effort, unlocks SDK features)
3. Session resume via SDK (M effort, major UX improvement)
4. Code block copy button (S effort, quick win)
5. Tool activity enhancement (M effort, professional feel)
6. Token/cost tracking (M effort, user value)
