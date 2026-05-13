import { Mention } from '@tiptap/extension-mention';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { RefObject } from 'react';
import { FileMentionComponent } from './file-mention-component';
import { createSuggestionConfig } from './suggestion';

/**
 * Creates a FileMention extension with React NodeView rendering.
 * Uses refs for dynamic projectId and popup state callbacks.
 */
export function createFileMentionWithView(
  projectIdRef?: RefObject<string | null | undefined>,
  onPopupStateChange?: (open: boolean) => void,
) {
  return Mention.extend({
    name: 'fileMention',

    addNodeView() {
      return ReactNodeViewRenderer(FileMentionComponent, {
        className: 'file-mention',
      });
    },
  }).configure({
    HTMLAttributes: {
      class: 'file-mention',
    },
    suggestion: createSuggestionConfig('file', projectIdRef, onPopupStateChange),
  });
}
