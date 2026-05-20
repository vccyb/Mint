
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { Zap } from 'lucide-react';

/**
 * Renders a skill mention as an inline chip inside the Tiptap editor.
 */
export function SkillMentionComponent({ node }: NodeViewProps) {
  const name = (node.attrs.label as string) ?? (node.attrs.id as string);

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center gap-0.5 text-[13px] text-purple-600 font-mono align-middle"
        contentEditable={false}
      >
        <Zap className="h-3 w-3 shrink-0" />
        {name}
      </span>
    </NodeViewWrapper>
  );
}
