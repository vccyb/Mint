'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { createFileMentionWithView } from './file-mention-extension';
import { createSkillMention } from './skill-mention-extension';
import { createMcpMention } from './mcp-mention-extension';
import type { MentionChip } from '@/types';
import { MENTION_TOKEN } from '@/types';

export interface RichInputHandle {
  focus: () => void;
  getTextContent: () => string;
  getMentions: () => MentionChip[];
  clear: () => void;
  setContent: (text: string) => void;
}

interface RichInputProps {
  placeholder?: string;
  projectId?: string | null;
  disabled?: boolean;
  onSend?: (text: string) => void;
  onUpdate?: (text: string, hasContent: boolean) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Extract plain text from the Tiptap editor JSON.
 * Mention nodes are converted to their token format: @{path}, /{skill}, #{tool}.
 */
function extractTextFromEditor(editor: Editor | null): string {
  if (!editor) return '';
  const json = editor.getJSON();
  return extractTextFromNode(json);
}

function extractTextFromNode(node: Record<string, unknown>): string {
  if (node.type === 'text') {
    return (node.text as string) ?? '';
  }

  // Handle mention nodes — convert to token format
  const nodeType = node.type as string;
  const attrs = node.attrs as Record<string, string> | undefined;
  if (nodeType === 'fileMention' && attrs?.id) {
    return MENTION_TOKEN.file(attrs.id);
  }
  if (nodeType === 'skillMention' && attrs?.id) {
    return MENTION_TOKEN.skill(attrs.id);
  }
  if (nodeType === 'mcpMention' && attrs?.id) {
    return MENTION_TOKEN.mcp(attrs.id);
  }

  // Recurse into children
  const children = node.content as Array<Record<string, unknown>> | undefined;
  if (children) {
    return children.map(extractTextFromNode).join('');
  }

  return '';
}

/**
 * Extract mentions from the editor content as MentionChip[].
 */
function extractMentionsFromEditor(editor: Editor | null): MentionChip[] {
  if (!editor) return [];
  const json = editor.getJSON();
  const mentions: MentionChip[] = [];

  function walk(node: Record<string, unknown>) {
    const nodeType = node.type as string;
    const attrs = node.attrs as Record<string, string> | undefined;
    if (nodeType === 'fileMention' && attrs?.id) {
      mentions.push({
        type: 'file',
        label: attrs.label ?? attrs.id.split('/').pop() ?? attrs.id,
        value: attrs.id,
      });
    } else if (nodeType === 'skillMention' && attrs?.id) {
      mentions.push({ type: 'skill', label: attrs.id, value: attrs.id });
    } else if (nodeType === 'mcpMention' && attrs?.id) {
      mentions.push({ type: 'mcp', label: attrs.id, value: attrs.id });
    }

    const children = node.content as Array<Record<string, unknown>> | undefined;
    if (children) {
      children.forEach(walk);
    }
  }

  walk(json);
  return mentions;
}

export const RichInput = forwardRef<RichInputHandle, RichInputProps>(function RichInput(
  { placeholder, projectId, disabled, onSend, onUpdate, onFocus, onBlur },
  ref,
) {
  // Track whether we're in the middle of a send to avoid double-clear
  const sendingRef = useRef(false);
  // Track whether a suggestion popup is currently open
  const suggestionOpenRef = useRef(false);
  // Store projectId in a ref so extensions can read the latest value dynamically
  const projectIdRef = useRef(projectId);

  // Keep ref in sync with prop
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  const handlePopupStateChange = useCallback((open: boolean) => {
    suggestionOpenRef.current = open;
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: {},
        listItem: false,
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Send a message...',
      }),
      createFileMentionWithView(projectIdRef, handlePopupStateChange),
      createSkillMention(handlePopupStateChange),
      createMcpMention(handlePopupStateChange),
    ],
    editorProps: {
      attributes: {
        class:
          'tiptap-editor-outline-none text-[13px] leading-[20px] min-h-[28px] max-h-[160px] overflow-y-auto',
      },
      // Handle Enter key for sending — but NOT when suggestion popup is open
      handleKeyDown: (view, event) => {
        if (!editor) return false;
        // When suggestion popup is open, let the suggestion plugin handle these keys
        if (suggestionOpenRef.current) {
          if (
            event.key === 'Enter' ||
            event.key === 'ArrowUp' ||
            event.key === 'ArrowDown' ||
            event.key === 'Escape'
          ) {
            return false;
          }
        }
        if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          const text = extractTextFromEditor(editor);
          if (text.trim()) {
            onSend?.(text);
            // Clear editor after send
            sendingRef.current = true;
            editor.commands.clearContent();
            sendingRef.current = false;
          }
          return true;
        }
        // Shift+Tab for plan mode toggle — let parent handle it
        if (event.key === 'Tab' && event.shiftKey) {
          return false;
        }
        return false;
      },
    },
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      if (sendingRef.current) return;
      const text = extractTextFromEditor(ed);
      onUpdate?.(text, text.trim().length > 0);
    },
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
  });

  // Expose handle methods
  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getTextContent: () => extractTextFromEditor(editor),
    getMentions: () => extractMentionsFromEditor(editor),
    clear: () => editor?.commands.clearContent(),
    setContent: (text: string) => {
      editor?.commands.setContent(text ? `<p>${text}</p>` : '');
    },
  }));

  // Focus on mount
  useEffect(() => {
    if (editor && !disabled) {
      editor.commands.focus('end');
    }
  }, [editor, disabled]);

  return (
    <div className="flex-1 min-w-0 rich-input-wrapper" onClick={() => editor?.commands.focus()}>
      <EditorContent editor={editor} />
    </div>
  );
});
