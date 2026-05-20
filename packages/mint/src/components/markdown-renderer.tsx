'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

/** Clipboard SVG icon for copy button */
function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CodeBlockWithCopy({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const lang = className?.replace('language-', '') ?? '';

  return (
    <div className="my-3 rounded-lg overflow-hidden shadow-elevation-1">
      {/* Header bar: language label + copy button */}
      <div className="flex items-center justify-between bg-bg-warm/80 backdrop-blur-sm px-3 py-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground font-mono uppercase tracking-wider">
          {lang || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-text-tertiary hover:text-muted-foreground transition-colors text-[10px] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied!
            </>
          ) : (
            <>
              <ClipboardIcon /> 复制
            </>
          )}
        </button>
      </div>
      {/* Code body: light background */}
      <pre className="overflow-x-auto bg-card p-4 text-sm leading-relaxed !mt-0">
        <code className={`${className ?? ''} text-foreground font-mono`}>{children}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Partial<Components> = {
  pre: ({ children }) => {
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
      <pre className="overflow-x-auto rounded-lg bg-card p-4 text-sm leading-relaxed my-3 text-foreground">
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
      <table className="w-full text-sm border-collapse border border-border">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-bg-warm px-3 py-1.5 text-left text-xs font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-1.5 text-sm even:bg-bg-warm/50">{children}</td>
  ),
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-0.5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-primary/20 pl-4 text-muted-foreground">
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
