
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { getFileIcon } from '@/lib/file-icons';

/**
 * Renders a file mention as an inline chip inside the Tiptap editor.
 * Uses NodeViewWrapper for seamless integration with ProseMirror.
 */
export function FileMentionComponent({ node }: NodeViewProps) {
  const path = node.attrs.id as string;
  const fileName = path.split('/').pop() ?? path;
  const { Icon, color } = getFileIcon(fileName);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[13px] text-primary',
          'font-mono cursor-pointer hover:underline align-middle',
        )}
        title={path}
        contentEditable={false}
      >
        <Icon className={cn('h-3 w-3 shrink-0', color)} />
        {fileName}
      </span>
    </NodeViewWrapper>
  );
}
