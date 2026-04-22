'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

function CodeBlockWithCopy({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  // Extract language from className (e.g. "language-typescript")
  const lang = className?.replace('language-', '') ?? '';

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between rounded-t-xl border border-border bg-bg-warm px-4 py-1.5">
        <span className="text-[10px] text-text-tertiary font-mono uppercase">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-text-tertiary hover:text-text transition-colors text-[10px]"
        >
          {copied ? (
            <><Check className="h-3 w-3" /> Copied</>
          ) : (
            <><Copy className="h-3 w-3" /> Copy</>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-b-xl bg-bg-warm p-4 text-sm leading-relaxed border border-t-0 border-border !mt-0">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Partial<Components> = {
  pre: ({ children }) => {
    // Extract code content and className from the child <code> element
    const codeElement = children as React.ReactElement<{
      className?: string;
      children?: ReactNode;
    }>;
    if (codeElement?.props?.className) {
      return (
        <CodeBlockWithCopy className={codeElement.props.className}>
          {codeElement.props.children}
        </CodeBlockWithCopy>
      );
    }
    return (
      <pre className="overflow-x-auto rounded-xl bg-bg-warm p-4 text-sm leading-relaxed my-3 border border-border">
        {children}
      </pre>
    );
  },
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="rounded-[3px] bg-bg-warm px-1 py-0.5 text-[13px] font-mono text-primary-text border border-border"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 hover:decoration-primary transition-colors"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border-collapse">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-bg-warm px-3 py-1.5 text-left text-xs font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-1.5 text-sm">{children}</td>
  ),
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-0.5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-[3px] border-primary/30 pl-4 text-text-secondary italic">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mt-3 mb-1.5">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="my-1.5">{children}</p>,
};

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
