
import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { EnterKey, htmlToMarkdown } from '@/lib/tiptap-extensions';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (markdown: string) => void;
  onKeyDown?: (e: {
    key: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    preventDefault: () => void;
  }) => void;
  onInputChange?: (value: string) => void;
  className?: string;
}

export function TiptapEditor({
  placeholder,
  disabled,
  onSend,
  onKeyDown,
  onInputChange,
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: {
          keepMarks: false,
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Send a message...',
      }),
      EnterKey,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
      handleKeyDown: (_view, event) => {
        // Forward keydown for external handling (e.g., @ mentions)
        if (onKeyDown) {
          onKeyDown({
            key: event.key,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            preventDefault: () => event.preventDefault(),
          });
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const text = e.getText();
      if (onInputChange) {
        onInputChange(text);
      }
    },
  });

  // Listen for custom 'tiptap-send' event from EnterKey extension
  useEffect(() => {
    if (!editor) return;

    const handleSendEvent = () => {
      if (!onSend || disabled) return;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      if (markdown) {
        onSend(markdown);
        editor.commands.clearContent();
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('tiptap-send', handleSendEvent);
    return () => dom.removeEventListener('tiptap-send', handleSendEvent);
  }, [editor, onSend, disabled]);

  // Public method to get current markdown
  const getMarkdown = useCallback(() => {
    if (!editor) return '';
    return htmlToMarkdown(editor.getHTML());
  }, [editor]);

  // Public method to clear content
  const clear = useCallback(() => {
    editor?.commands.clearContent();
  }, [editor]);

  // Public method to set content (for voice input)
  const setContent = useCallback(
    (text: string) => {
      if (!editor) return;
      // Convert plain text to paragraphs
      const html = text
        .split('\n')
        .map((line) => `<p>${line || '<br>'}</p>`)
        .join('');
      editor.commands.setContent(html);
    },
    [editor],
  );

  // Expose imperative methods via a ref-like pattern
  // We'll store them on the editor instance for the parent to access
  useEffect(() => {
    if (editor) {
      (editor as unknown as Record<string, unknown>)._mintGetMarkdown = getMarkdown;
      (editor as unknown as Record<string, unknown>)._mintClear = clear;
      (editor as unknown as Record<string, unknown>)._mintSetContent = setContent;
    }
  }, [editor, getMarkdown, clear, setContent]);

  return (
    <div
      className={cn(
        'max-h-32 min-h-[24px] flex-1 text-sm leading-relaxed focus:outline-none disabled:opacity-50',
        className,
      )}
    >
      <EditorContent
        editor={editor}
        className="[&_.tiptap]:min-h-[24px] [&_.tiptap]:max-h-32 [&_.tiptap]:outline-none [&_.tiptap]:overflow-y-auto [&_.tiptap]:text-sm [&_.tiptap]:leading-relaxed [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-text-tertiary [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
