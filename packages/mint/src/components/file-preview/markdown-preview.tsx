'use client';

import { MarkdownRenderer } from '../markdown-renderer';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="px-6 py-4 max-w-none prose prose-sm">
      <MarkdownRenderer content={content} />
    </div>
  );
}
