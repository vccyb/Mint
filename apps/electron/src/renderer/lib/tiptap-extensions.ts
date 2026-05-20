import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/**
 * Custom Tiptap extension:
 * - Enter = send message (unless Shift held or IME composing)
 * - Shift+Enter = newline
 */
export const EnterKey = Extension.create({
  name: 'enterKey',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Don't intercept during IME composition
        if (editor.view.composing) return false;
        // Shift+Enter should create a newline (default behavior)
        return false;
      },
      'Shift-Enter': () => {
        // Let Tiptap handle Shift+Enter as newline
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const key = new PluginKey('enterKey');

    return [
      new Plugin({
        key,
        handleKeyDown(view: EditorView, event: KeyboardEvent) {
          // Only handle Enter key
          if (event.key !== 'Enter') return false;

          // Don't intercept during IME composition
          if (view.composing) return false;

          // Shift+Enter = newline (let default handle it)
          if (event.shiftKey) return false;

          // Plain Enter = send
          event.preventDefault();

          // Dispatch a custom event on the editor DOM element
          // The TiptapEditor component listens for this
          const sendEvent = new CustomEvent('tiptap-send');
          view.dom.dispatchEvent(sendEvent);
          return true;
        },
      }),
    ];
  },
});

/**
 * Converts Tiptap HTML to lightweight markdown for sending.
 */
export function htmlToMarkdown(html: string): string {
  let text = html;

  // Bold
  text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  // Italic
  text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
  // Code (inline)
  text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');
  // Paragraphs → newlines
  text = text.replace(/<\/p>\s*<p>/g, '\n\n');
  text = text.replace(/<p>/g, '');
  text = text.replace(/<\/p>/g, '');
  // Line breaks
  text = text.replace(/<br\s*\/?>/g, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Collapse trailing whitespace
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
