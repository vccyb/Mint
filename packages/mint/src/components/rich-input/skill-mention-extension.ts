import { Mention } from '@tiptap/extension-mention';
import { ReactNodeViewRenderer } from '@tiptap/react';
import type { RefObject } from 'react';
import { SkillMentionComponent } from './skill-mention-component';
import { createSuggestionConfig } from './suggestion';

export function createSkillMention(
  onPopupStateChange?: (open: boolean) => void,
) {
  return Mention.extend({
    name: 'skillMention',

    addNodeView() {
      return ReactNodeViewRenderer(SkillMentionComponent, {
        className: 'skill-mention',
      });
    },
  }).configure({
    HTMLAttributes: {
      class: 'skill-mention',
    },
    suggestion: createSuggestionConfig('skill', undefined as unknown as RefObject<string | null | undefined>, onPopupStateChange),
  });
}
