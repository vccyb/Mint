'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { MessageList } from './message-list';
import { MessageInput, type MessageInputHandle } from './message-input';
import { FilePanel } from './file-panel';
import { PreviewPanel, type OpenFile } from './preview-panel';
import { AskQuestionBanner } from './ask-question-banner';
import type { ChatMessage, Attachment, PermissionRequestData } from '@/types';

interface AgentViewProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamStartTime?: number | null;
  onSend: (message: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  pendingPermission?: PermissionRequestData | null;
  onPermissionDecision?: (
    requestId: string,
    behavior: 'allow' | 'deny',
    updatedInput?: Record<string, unknown>,
  ) => void;
  concurrencyLimitReached?: boolean;
}

export function AgentView({
  messages,
  isStreaming,
  streamStartTime,
  onSend,
  onStop,
  pendingPermission,
  onPermissionDecision,
  concurrencyLimitReached,
}: AgentViewProps) {
  const [showFiles, setShowFiles] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingContent, setEditingContent] = useState<string>('');
  const inputRef = useRef<MessageInputHandle>(null);

  // Auto-focus input when messages change (new/cleared session)
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages.length]);

  const fetchFileContent = useCallback(async (filePath: string, _fileName: string) => {
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load file');
      }
      const data = await res.json();

      setOpenFiles((prev) => {
        if (prev.some((f) => f.path === data.path)) return prev;
        return [...prev, data];
      });
      setActiveFile(data.path);

      // Auto-show files panel when previewing
      setShowFiles(true);
    } catch (err) {
      console.error('Failed to fetch file:', err);
    }
  }, []);

  const handleFileClose = useCallback((path: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== path);
      if (next.length === 0) {
        setActiveFile('');
      } else {
        const idx = prev.findIndex((f) => f.path === path);
        const nextIdx = Math.min(idx, next.length - 1);
        setActiveFile(next[nextIdx].path);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-bg-warm px-6 py-2 shrink-0">
        <div className="pill bg-primary-light text-primary-text">Agent</div>
        <span className="text-xs text-text-tertiary">
          Autonomous agent — reads files, runs commands, writes code
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowFiles(!showFiles)}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors cursor-pointer ${
            showFiles
              ? 'bg-primary-light text-primary-text'
              : 'text-text-tertiary hover:bg-bg-warm hover:text-text'
          }`}
          aria-label="Toggle file panel"
        >
          <FolderOpen className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      {isFullscreen && showFiles ? (
        /* Fullscreen = files panel takes entire width */
        <div className="flex flex-1 min-h-0">
          <div className="w-60 shrink-0 border-r border-border overflow-hidden">
            <FilePanel
              onClose={() => setShowFiles(false)}
              onFileClick={fetchFileContent}
            />
          </div>
          <PreviewPanel
            files={openFiles}
            activeFile={activeFile}
            onActiveChange={setActiveFile}
            onFileClose={handleFileClose}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          />
        </div>
      ) : showFiles ? (
        /* Split = chat | files */
        <div className="flex flex-1 min-h-0">
          {/* Chat — flex-1 so it takes remaining space */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <MessageList messages={messages} isStreaming={isStreaming} streamStartTime={streamStartTime} onEditMessage={(_id, content) => setEditingContent(content)} />
            {pendingPermission && onPermissionDecision && (
              <div className="px-6 py-2">
                <AskQuestionBanner
                  request={pendingPermission}
                  onDecision={onPermissionDecision}
                />
              </div>
            )}
            <MessageInput
              ref={inputRef}
              onSend={onSend}
              onStop={onStop}
              isStreaming={isStreaming}
              placeholder="Describe a task for the agent..."
              externalValue={editingContent}
              concurrencyLimitReached={concurrencyLimitReached}
            />
          </div>

          {/* Divider */}
          <div className="w-px shrink-0 bg-border" />

          {/* Files panel: fixed-width sidebar containing file tree + preview */}
          <div className="flex w-[420px] shrink-0 min-h-0">
            {/* File tree */}
            <div className="w-48 shrink-0 border-r border-border overflow-hidden">
              <FilePanel
                onClose={() => setShowFiles(false)}
                onFileClick={fetchFileContent}
              />
            </div>

            {/* Preview */}
            <PreviewPanel
              files={openFiles}
              activeFile={activeFile}
              onActiveChange={setActiveFile}
              onFileClose={handleFileClose}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((v) => !v)}
            />
          </div>
        </div>
      ) : (
        /* Chat only */
        <div className="flex flex-col flex-1 min-h-0">
          <MessageList messages={messages} isStreaming={isStreaming} onEditMessage={(_id, content) => setEditingContent(content)} />
          {pendingPermission && onPermissionDecision && (
            <div className="px-6 py-2">
              <AskQuestionBanner
                request={pendingPermission}
                onDecision={onPermissionDecision}
              />
            </div>
          )}
          <MessageInput
            ref={inputRef}
            onSend={onSend}
            onStop={onStop}
            isStreaming={isStreaming}
            placeholder="Describe a task for the agent..."
            externalValue={editingContent}
            concurrencyLimitReached={concurrencyLimitReached}
          />
        </div>
      )}
    </div>
  );
}
