import { Mention } from '@tiptap/extension-mention';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { RefObject } from 'react';
import { McpMentionComponent } from './mcp-mention-component';
import { createSuggestionConfig } from './suggestion';

export function createMcpMention(onPopupStateChange?: (open: boolean) => void) {
  return Mention.extend({
    name: 'mcpMention',

    addNodeView() {
      return ReactNodeViewRenderer(McpMentionComponent, {
        className: 'mcp-mention',
      });
    },
  }).configure({
    HTMLAttributes: {
      class: 'mcp-mention',
    },
    suggestion: createSuggestionConfig(
      'mcp',
      undefined as unknown as RefObject<string | null | undefined>,
      onPopupStateChange,
    ),
  });
}
