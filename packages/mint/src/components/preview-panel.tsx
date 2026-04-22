'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import hljs from 'highlight.js';

export interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  size: number;
}

interface PreviewPanelProps {
  files: OpenFile[];
  activeFile: string;
  onActiveChange: (path: string) => void;
  onFileClose: (path: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function PreviewPanel({
  files,
  activeFile,
  onActiveChange,
  onFileClose,
  isFullscreen,
  onToggleFullscreen,
}: PreviewPanelProps) {
  const currentFile = files.find((f) => f.path === activeFile);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!tabContainerRef.current || !activeFile) return;
    const activeTab = tabContainerRef.current.querySelector(
      `[data-path="${CSS.escape(activeFile)}"]`,
    );
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeFile]);

  const handleClose = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      onFileClose(path);
    },
    [onFileClose],
  );

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-bg">
      {/* Tab bar: [tabs (scroll, no scrollbar)] [fullscreen btn (fixed)] */}
      <div className="flex items-stretch border-b border-border bg-bg-warm shrink-0">
        {/* Left: scrollable tabs — hidden scrollbar */}
        <div
          ref={tabContainerRef}
          className="flex flex-1 min-w-0 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {files.length === 0 ? (
            <div className="flex items-center px-3 text-xs text-text-tertiary whitespace-nowrap">
              No open files
            </div>
          ) : (
            files.map((file) => (
              <button
                key={file.path}
                data-path={file.path}
                onClick={() => onActiveChange(file.path)}
                className={`flex items-center gap-1 shrink-0 px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer border-b-2 ${
                  file.path === activeFile
                    ? 'bg-bg border-b-primary text-text font-medium'
                    : 'border-b-transparent text-text-secondary hover:text-text hover:bg-bg'
                }`}
                title={file.path}
              >
                <span className="truncate max-w-24">{file.name}</span>
                <span
                  onClick={(e) => handleClose(e, file.path)}
                  className="text-text-tertiary hover:text-text ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            ))
          )}
        </div>

        {/* Right: fullscreen button — never scrolls away */}
        <button
          onClick={onToggleFullscreen}
          className="shrink-0 px-2 text-text-tertiary hover:text-text transition-colors cursor-pointer"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* File path breadcrumb */}
      {currentFile && (
        <div className="px-4 py-1 bg-bg-warm text-text-tertiary text-[11px] font-mono border-b border-border shrink-0">
          {currentFile.path}
        </div>
      )}

      {/* Content */}
      {currentFile ? (
        <div className="flex-1 overflow-auto min-h-0">
          <CodeView content={currentFile.content} language={currentFile.language} />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center min-h-0">
          <span className="text-xs text-text-tertiary">Click a file to preview</span>
        </div>
      )}
    </div>
  );
}

function CodeView({ content, language }: { content: string; language: string }) {
  const lines = content.split('\n');

  let highlighted: string;
  try {
    if (language && language !== 'plaintext' && hljs.getLanguage(language)) {
      highlighted = hljs.highlight(content, { language }).value;
    } else {
      highlighted = hljs.highlightAuto(content).value;
    }
  } catch {
    highlighted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const highlightedLines = splitHighlightedLines(highlighted);

  return (
    <pre className="text-[13px] leading-5 font-mono p-0 m-0">
      <code className={`language-${language}`}>
        {lines.map((_, i) => (
          <div key={i} className="flex hover:bg-bg-hover">
            <span className="text-text-tertiary w-12 text-right pr-3 select-none shrink-0 leading-5">
              {i + 1}
            </span>
            <span
              className="flex-1 leading-5"
              dangerouslySetInnerHTML={{ __html: highlightedLines[i] ?? '' }}
            />
          </div>
        ))}
      </code>
    </pre>
  );
}

function splitHighlightedLines(html: string): string[] {
  const result: string[] = [];
  let current = '';
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) {
        current += html.slice(i);
        break;
      }
      current += html.slice(i, end + 1);
      i = end + 1;
    } else if (html[i] === '\n') {
      result.push(current);
      current = '';
      i++;
    } else {
      current += html[i];
      i++;
    }
  }

  result.push(current);
  return result;
}
