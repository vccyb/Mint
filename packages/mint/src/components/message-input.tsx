'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type DragEvent,
} from 'react';
import { ArrowUp, Square, Paperclip, Mic, X, FileText, Image as ImageIcon, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isTextFile, isPdfFile } from '@/lib/attachment-utils';
import { ALLOWED_FILE_TYPES } from '@/lib/constants';
import type { Attachment, MentionChip } from '@/types';
import { extractMentions } from '@/types';
import { PermissionModeSelector } from './permission-mode-selector';
import { RichInput, type RichInputHandle } from './rich-input/rich-input';
import './rich-input/rich-input.css';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

interface MessageInputProps {
  onSend: (message: string, attachments?: Attachment[], mentionedTools?: MentionChip[], enableThinking?: boolean) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  externalValue?: string;
  sessionKey?: string | null;
  concurrencyLimitReached?: boolean;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
  onPermissionModeChange?: (mode: 'bypassPermissions' | 'default' | 'plan') => void;
  onTogglePlanMode?: () => void;
  /** Current token usage (used tokens) */
  tokenUsage?: number;
  /** Maximum token budget */
  tokenBudget?: number;
  /** Whether the ask/todo panel is active (dims input) */
  panelActive?: boolean;
  /** Disable text input while keeping stop button clickable */
  inputDisabled?: boolean;
  /** Whether to render the outer container (default: true) */
  withContainer?: boolean;
  /** Whether thinking mode is enabled (chat mode) */
  thinkingEnabled?: boolean;
  /** Toggle thinking mode */
  onThinkingToggle?: () => void;
  /** Input mode: 'agent' uses Tiptap rich editor with mentions, 'chat' uses plain textarea */
  mode?: 'agent' | 'chat';
  /** Current project ID for scoping file search in agent mode */
  projectId?: string | null;
}

export interface MessageInputHandle {
  focus: () => void;
}

function readFileAsAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith('image/');
    const isText = !isImage && isTextFile(file.type, file.name);
    const isPdf = !isImage && !isText && isPdfFile(file.type, file.name);

    // Unsupported binary files (ZIP, EXE, etc.): skip content
    if (!isImage && !isText && !isPdf) {
      resolve({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type,
        size: file.size,
        content: undefined,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type,
        size: file.size,
        content: reader.result as string,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));

    if (isImage || isPdf) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  placeholder,
  externalValue,
  sessionKey,
  concurrencyLimitReached,
  permissionMode,
  onPermissionModeChange,
  onTogglePlanMode,
  tokenUsage = 0,
  tokenBudget = 200000,
  panelActive = false,
  inputDisabled = false,
  withContainer = true,
  thinkingEnabled = false,
  onThinkingToggle,
  mode = 'chat',
  projectId = null,
}, ref) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const richInputRef = useRef<RichInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef('');
  const interimTextRef = useRef('');
  const sessionDraftsRef = useRef<Map<string, { input: string; attachments: Attachment[] }>>(new Map());
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const isAgentMode = mode === 'agent';

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (isAgentMode) {
        richInputRef.current?.focus();
      } else {
        textareaRef.current?.focus();
      }
    },
  }));

  // Auto-focus on mount
  useEffect(() => {
    if (isAgentMode) {
      richInputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [isAgentMode]);

  useEffect(() => {
    const key = sessionKey ?? '__default__';
    const draft = sessionDraftsRef.current.get(key);
    setInput(draft?.input ?? '');
    setAttachments(draft?.attachments ?? []);
    if (!isAgentMode) {
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      });
    } else if (draft?.input) {
      richInputRef.current?.setContent(draft.input);
    }
  }, [sessionKey, isAgentMode]);

  useEffect(() => {
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input, attachments });
  }, [attachments, input, sessionKey]);

  // Handle externalValue (for edit message feature)
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== '') {
      setInput(externalValue);
      if (isAgentMode) {
        richInputRef.current?.setContent(externalValue);
      } else {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(externalValue.length, externalValue.length);
          }
        });
      }
    }
  }, [externalValue, isAgentMode]);

  // Web Speech API availability (useState+useEffect to avoid hydration mismatch)
  const [speechAvailable, setSpeechAvailable] = useState(false);
  useEffect(() => {
    setSpeechAvailable(
      ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window),
    );
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (attachments.length + fileArray.length > MAX_FILES) {
        showError(`Maximum ${MAX_FILES} files allowed`);
        return;
      }

      const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE);
      if (oversized) {
        showError(`File "${oversized.name}" exceeds 1MB limit`);
        return;
      }

      // Reject unsupported file types (binary files that aren't images or PDFs)
      const unsupported = fileArray.find(
        (f) => !f.type.startsWith('image/') && !isTextFile(f.type, f.name) && !isPdfFile(f.type, f.name),
      );
      if (unsupported) {
        showError(`"${unsupported.name}" is not a supported file type. Use text, code, or image files.`);
        return;
      }

      try {
        const newAttachments = await Promise.all(fileArray.map(readFileAsAttachment));
        setAttachments((prev) => [...prev, ...newAttachments]);

        // Warn about images in agent mode
        if (isAgentMode) {
          const hasImages = newAttachments.some((a) => a.type.startsWith('image/'));
          if (hasImages) {
            showError('Images cannot be processed in Agent mode — sent as filename reference only');
          }
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to read file');
      }
    },
    [attachments.length, isAgentMode, showError],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const fetchMentionedFileContent = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        return `[File: ${data.path}]\n\`\`\`\n${data.content}\n\`\`\``;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Chat mode send (plain textarea)
  const handleChatSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;

    const allMentions = extractMentions(trimmed);
    const fileMentions = allMentions.filter((m) => m.type === 'file');
    const nonFileMentions = allMentions.filter((m) => m.type !== 'file');

    let finalAttachments = attachments.length > 0 ? [...attachments] : undefined;

    if (fileMentions.length > 0) {
      const fileContents = await Promise.all(
        fileMentions.map((m) => fetchMentionedFileContent(m.value)),
      );
      const contentAttachments: Attachment[] = fileContents
        .filter((c): c is string => c !== null)
        .map((content, i) => ({
          id: `mention-${Date.now()}-${i}`,
          name: fileMentions[i].value,
          type: 'text/plain',
          size: content.length,
          content,
        }));

      if (contentAttachments.length > 0) {
        finalAttachments = [...(finalAttachments ?? []), ...contentAttachments];
      }
    }

    onSend(trimmed, finalAttachments, nonFileMentions.length > 0 ? nonFileMentions : undefined, thinkingEnabled);
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input: '', attachments: [] });
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachments, disabled, onSend, fetchMentionedFileContent, sessionKey, thinkingEnabled]);

  // Agent mode send (RichInput)
  const handleAgentSend = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    const allMentions = extractMentions(trimmed);
    const fileMentions = allMentions.filter((m) => m.type === 'file');
    const nonFileMentions = allMentions.filter((m) => m.type !== 'file');

    let finalAttachments = attachments.length > 0 ? [...attachments] : undefined;

    if (fileMentions.length > 0) {
      const fileContents = await Promise.all(
        fileMentions.map((m) => fetchMentionedFileContent(m.value)),
      );
      const contentAttachments: Attachment[] = fileContents
        .filter((c): c is string => c !== null)
        .map((content, i) => ({
          id: `mention-${Date.now()}-${i}`,
          name: fileMentions[i].value,
          type: 'text/plain',
          size: content.length,
          content,
        }));

      if (contentAttachments.length > 0) {
        finalAttachments = [...(finalAttachments ?? []), ...contentAttachments];
      }
    }

    onSend(trimmed, finalAttachments, nonFileMentions.length > 0 ? nonFileMentions : undefined, thinkingEnabled);
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input: '', attachments: [] });
    setInput('');
    setAttachments([]);
  }, [attachments, disabled, onSend, fetchMentionedFileContent, sessionKey, thinkingEnabled]);

  // Chat textarea keydown handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab' && e.shiftKey && onTogglePlanMode) {
        e.preventDefault();
        onTogglePlanMode();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleChatSend();
      }
    },
    [handleChatSend, onTogglePlanMode],
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    setHasContent(value.trim().length > 0);
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';
  };

  // Drag and drop
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  // Paste handler (chat mode textarea only)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    },
    [addFiles],
  );

  // Voice input
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'zh-CN';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      const isFinal = event.results[0].isFinal;
      if (isFinal) {
        baseTextRef.current = baseTextRef.current
          ? baseTextRef.current + ' ' + transcript
          : transcript;
        interimTextRef.current = '';
      } else {
        interimTextRef.current = transcript;
      }
      const full = [baseTextRef.current, interimTextRef.current].filter(Boolean).join(' ');
      setInput(full);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    baseTextRef.current = input;
    interimTextRef.current = '';
    recognition.start();
    setIsListening(true);
  }, [isListening, input]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const canSend = Boolean(hasContent || attachments.length > 0) && !concurrencyLimitReached;
  const tokenPct = tokenBudget > 0 ? (tokenUsage / tokenBudget) * 100 : 0;
  const formatTokens = (n: number) => {
    if (n >= 1000) return n.toLocaleString();
    return String(n);
  };
  const tokenBarColor = tokenPct > 80 ? 'bg-[#FF3B30]' : tokenPct > 50 ? 'bg-[#FF9500]' : 'bg-[#34C759]';

  // The send button click handler depends on mode
  const handleSendClick = isAgentMode
    ? () => {
        const text = richInputRef.current?.getTextContent() ?? '';
        if (text.trim()) {
          handleAgentSend(text);
          richInputRef.current?.clear();
        }
      }
    : handleChatSend;

  const innerContent = (
    <>
      <div
        ref={inputContainerRef}
        className={cn(
          'mx-auto flex w-[80%] flex-col rounded-xl border bg-white overflow-hidden',
          'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
          isFocused && !dragOver
            ? 'border-[1.5px] border-[#007AFF] shadow-[0_0_0_3px_rgba(0,122,255,0.08)]'
            : dragOver
              ? 'border-[1.5px] border-[#007AFF] bg-[#E8F2FF]/30'
              : 'border-[rgba(0,0,0,0.08)]',
          (panelActive || inputDisabled) && 'opacity-50',
          panelActive && 'pointer-events-none',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Error toast */}
        {error && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Concurrency limit warning */}
      {concurrencyLimitReached && (
        <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          最多同时执行 5 个 Agent 任务，请等待完成后再试
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 px-3 pt-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-warm px-2 py-1 text-xs text-text-secondary"
            >
              {att.type.startsWith('image/') ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <FileText className="h-3 w-3" />
              )}
              <span className="max-w-[120px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="ml-0.5 text-text-tertiary hover:text-text cursor-pointer"
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 pt-3 pb-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors cursor-pointer hover:text-text"
            aria-label="Attach file"
            disabled={disabled}
          >
            <Paperclip className="h-[14px] w-[14px]" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />

          {/* Input area — RichInput for agent, textarea for chat */}
          {isAgentMode ? (
            <RichInput
              ref={richInputRef}
              placeholder={placeholder ?? '描述一个任务给 Agent 执行...'}
              projectId={projectId}
              disabled={disabled || inputDisabled}
              onSend={handleAgentSend}
              onUpdate={(text, hasText) => {
                setInput(text);
                setHasContent(hasText);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder ?? 'Send a message...'}
              disabled={disabled || inputDisabled}
              rows={1}
              className="max-h-40 min-h-[28px] w-full resize-none bg-transparent py-1 text-[13px] leading-[20px] focus:outline-none disabled:opacity-50 placeholder:text-text-tertiary"
            />
          )}

          {speechAvailable && (
            <button
              onClick={toggleListening}
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer',
                isListening
                  ? 'text-red-500 animate-pulse'
                  : 'text-text-tertiary hover:text-text',
              )}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              disabled={disabled}
            >
              <Mic className="h-[14px] w-[14px]" />
            </button>
          )}

          {isStreaming && onStop ? (
            <button
              onClick={onStop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F7] text-text-secondary transition-colors cursor-pointer hover:bg-[#EDEDF0]"
              aria-label="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSendClick}
              disabled={disabled || !canSend}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer',
                canSend
                  ? 'bg-primary text-white hover:bg-primary-hover shadow-[0_2px_6px_rgba(0,122,255,0.3)]'
                  : 'bg-[#EDEDF0] text-text-tertiary',
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Token usage bar */}
        <div className='px-3 pt-1'>
          <div className='flex justify-between py-0.5'>
            <span className='text-[9px] text-text-tertiary font-mono'>
              {formatTokens(tokenUsage)} / {tokenBudget >= 1000 ? `${Math.round(tokenBudget / 1000)}K` : tokenBudget} tokens
            </span>
            <span className={cn(
              'text-[9px] font-mono',
              tokenPct > 80 ? 'text-[#FF3B30]' : tokenPct > 50 ? 'text-[#FF9500]' : 'text-[#34C759]',
            )}>
              {tokenPct.toFixed(1)}%
            </span>
          </div>
          <div className='h-[2px] rounded-full bg-[#EDEDF0]'>
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', tokenBarColor)}
              style={{ width: `${Math.min(tokenPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Footer toolbar */}
        <div className='mt-1 flex items-center justify-between gap-3 border-t border-[rgba(0,0,0,0.04)] px-3 py-1.5'>
          <div className='flex items-center gap-2'>
            {onThinkingToggle && (
              <button
                onClick={onThinkingToggle}
                className={cn(
                  'flex h-5 items-center gap-1 rounded px-1.5 text-[10px] transition-colors cursor-pointer',
                  thinkingEnabled
                    ? 'bg-[#E8F2FF] text-[#007AFF]'
                    : 'text-text-tertiary hover:text-text hover:bg-bg-warm',
                )}
                title='Toggle thinking mode'
              >
                <Brain className='h-3 w-3' />
                <span>Thinking</span>
              </button>
            )}
            {permissionMode && onPermissionModeChange && (
              <PermissionModeSelector
                mode={permissionMode}
                onModeChange={onPermissionModeChange}
                onTogglePlanMode={onTogglePlanMode}
                shortcutLabel='Shift+Tab'
              />
            )}
          </div>
          <div className='flex items-center gap-2 text-[10px] text-text-tertiary font-mono'>
            <span>Enter 发送</span>
            <span className='text-[rgba(0,0,0,0.16)]'>·</span>
            <span>Shift+Enter 换行</span>
          </div>
        </div>
      </div>
    </>
  );

  // Conditionally render with or without outer container
  if (!withContainer) {
    return innerContent;
  }

  return (
    <div className={cn(
      'shrink-0 border-t border-[rgba(0,0,0,0.08)] bg-white px-6 py-3',
      panelActive && 'opacity-50 pointer-events-none',
    )}>
      {innerContent}
    </div>
  );
});
