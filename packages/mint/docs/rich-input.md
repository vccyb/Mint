# Rich Input System (TipTap)

## Overview

The rich input system is a TipTap-based editor with mention autocomplete for files (`@`), skills (`/`), and MCP tools (`#`). It uses custom ProseMirror node views to render inline mention chips.

## Module Structure

```
src/components/rich-input/
  rich-input.tsx              # Main RichInput component (forwardRef)
  suggestion.ts               # createSuggestionConfig factory
  suggestion-popup.tsx        # Suggestion popup with keyboard nav
  file-mention-extension.ts   # File mention TipTap node + React view
  skill-mention-extension.ts  # Skill mention TipTap node
  mcp-mention-extension.ts    # MCP tool mention TipTap node
  file-mention-component.tsx  # File chip (blue, file icon)
  skill-mention-component.tsx # Skill chip (purple, Zap icon)
  mcp-mention-component.tsx   # MCP chip (green, Wrench icon)
  rich-input.css              # TipTap editor styles
```

## RichInput Component

The main component wraps TipTap with `StarterKit`, `Placeholder`, and three custom Mention extensions.

### Ref Handle (`RichInputHandle`)

```typescript
interface RichInputHandle {
  focus(): void;
  getTextContent(): string;   // Content with mentions as inline tokens
  getMentions(): MentionChip[]; // Extracted mention objects
  clear(): void;
  setContent(text: string): void;
}
```

### Mention Token Serialization

When `getTextContent()` is called, the editor walks its ProseMirror AST and converts mention nodes to inline tokens:

| Mention Type | Trigger | Token Format | Example |
|-------------|---------|-------------|---------|
| File | `@` | `@{path}` | `@{src/lib/utils.ts}` |
| Skill | `/` | `/{skill}` | `/{code-review}` |
| MCP | `#` | `#{tool}` | `#{mcp__pencil__batch_get}` |

### Keyboard Behavior

- **Enter** → Send message (unless suggestion popup is open or Shift held or IME composing)
- **Shift+Enter** → New line
- **Up/Down** → Navigate suggestion popup
- **Escape** → Close suggestion popup

## Suggestion System

### createSuggestionConfig()

Factory function that creates a Tiptap `Suggestion` plugin configuration for each mention type:

| Config | File | Skill | MCP |
|--------|------|-------|-----|
| Trigger char | `@` | `/` | `#` |
| API endpoint | `/api/files/search` | `/api/skills/search` | `/api/tools/mcp/search` |
| Query param | `?q=term&projectId=...` | `?q=term` | `?q=term` |

### SuggestionPopup Component

Renders suggestion items with:
- Keyboard navigation (up/down/enter/escape)
- File icons for file type suggestions (via `lib/file-icons.ts`)
- Loading spinner during fetch
- Fixed positioning (no tippy.js dependency)

## Mention Extensions

Each mention type extends TipTap's `Mention` extension with a custom `ReactNodeViewRenderer`:

### File Mention (`file-mention-extension.ts`)
- Node name: `fileMention`
- Renders: Blue chip with file type icon and filename
- Data: `{ id: path, label: filename }`

### Skill Mention (`skill-mention-extension.ts`)
- Node name: `skillMention`
- Renders: Purple chip with Zap icon and skill name
- Data: `{ id: skillName, label: skillName }`

### MCP Mention (`mcp-mention-extension.ts`)
- Node name: `mcpMention`
- Renders: Green chip with Wrench icon and tool name
- Data: `{ id: toolName, label: toolName }`

## Styles (`rich-input.css`)

- Placeholder styling with muted color
- Inline mention node display (inline-flex, no line break)
- Minimal paragraph margins for compact layout
- ProseMirror outline removal (custom focus ring instead)

## Integration

The RichInput component is used in `MessageInput` (main input bar):

```tsx
<RichInput
  ref={inputRef}
  placeholder="Type a message..."
  onSend={handleSend}
  projectId={projectId}
/>
```

On send, the component:
1. Gets text content with serialized mention tokens
2. Extracts mention chips for separate processing
3. Passes both to the parent's send handler
4. Mentions are sent to the API as `mentionedTools` array
