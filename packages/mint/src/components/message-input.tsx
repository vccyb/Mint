'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type KeyboardEvent,
  type DragEvent,
  type ClipboardEvent,
} from 'react';
import { ArrowUp, Square, Paperclip, Mic, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Attachment, MentionType, MentionChip } from '@/types';
import { MENTION_TRIGGERS, MENTION_TOKEN, extractMentions } from '@/types';
import { MentionPopup } from './mention-popup';
import { PermissionModeSelector } from './permission-mode-selector';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

interface MessageInputProps {
  onSend: (message: string, attachments?: Attachment[], mentionedTools?: MentionChip[]) => void;
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
}

export interface MessageInputHandle {
  focus: () => void;
}

function readFileAsAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');

    reader.onload = () => {
      resolve({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: file.name,
        type: file.type,
        size: file.size,
        content: isImage
          ? (reader.result as string)
          : (reader.result as string),
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

interface MentionState {
  active: boolean;
  type: MentionType;
  query: string;
  startPos: number;
  anchorRect: DOMRect | null;
}

function detectMentionType(textBeforeCursor: string): { type: MentionType; query: string; startPos: number } | null {
  // Check in priority order: @ (file), / (skill), # (mcp)
  for (const [type, regex] of Object.entries(MENTION_TRIGGERS) as [MentionType, RegExp][]) {
    const match = regex.exec(textBeforeCursor);
    if (match) {
      // For skill trigger (/(^|\s)\/(\S*)$/), the match may include a leading space.
      // startPos should point at the "/" character, not the space.
      const triggerChar = textBeforeCursor[match.index] === '/' ? match.index : match.index + 1;
      return { type, query: match[1], startPos: triggerChar };
    }
  }
  return null;
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
}, ref) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mention, setMention] = useState<MentionState>({
    active: false, type: 'file', query: '', startPos: -1, anchorRect: null,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseTextRef = useRef('');
  const interimTextRef = useRef('');
  const sessionDraftsRef = useRef<Map<string, { input: string; attachments: Attachment[] }>>(new Map());
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const key = sessionKey ?? '__default__';
    const draft = sessionDraftsRef.current.get(key);
    setInput(draft?.input ?? '');
    setAttachments(draft?.attachments ?? []);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    });
  }, [sessionKey]);

  useEffect(() => {
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input, attachments });
  }, [attachments, input, sessionKey]);

  // Handle externalValue (for edit message feature)
  useEffect(() => {
    if (externalValue !== undefined && externalValue !== '') {
      setInput(externalValue);
      const key = sessionKey ?? '__default__';
      const currentDraft = sessionDraftsRef.current.get(key);
      sessionDraftsRef.current.set(key, {
        input: externalValue,
        attachments: currentDraft?.attachments ?? attachments,
      });
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(externalValue.length, externalValue.length);
        }
      });
    }
  }, [attachments, externalValue, sessionKey]);

  // Web Speech API availability
  const speechAvailable =
    typeof window !== 'undefined' &&
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));

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

      try {
        const newAttachments = await Promise.all(fileArray.map(readFileAsAttachment));
        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to read file');
      }
    },
    [attachments.length, showError],
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

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;

    // Extract all mention types
    const allMentions = extractMentions(trimmed);
    const fileMentions = allMentions.filter((m) => m.type === 'file');
    const nonFileMentions = allMentions.filter((m) => m.type !== 'file');

    let finalAttachments = attachments.length > 0 ? [...attachments] : undefined;

    // Fetch file content for @{path} mentions
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

    onSend(trimmed, finalAttachments, nonFileMentions.length > 0 ? nonFileMentions : undefined);
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input: '', attachments: [] });
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, attachments, disabled, onSend, fetchMentionedFileContent, sessionKey]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (mention.active && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape')) {
        return;
      }
      if (mention.active && e.key === 'Enter') {
        return;
      }
      if (e.key === 'Tab' && e.shiftKey && onTogglePlanMode) {
        e.preventDefault();
        onTogglePlanMode();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, mention.active, onTogglePlanMode],
  );

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = target.scrollHeight + 'px';

    // Check for all mention triggers at cursor position
    const cursorPos = target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const detected = detectMentionType(textBeforeCursor);

    if (detected) {
      const anchorRect = inputContainerRef.current?.getBoundingClientRect() ?? null;
      setMention({
        active: true,
        type: detected.type,
        query: detected.query,
        startPos: detected.startPos,
        anchorRect,
      });
    } else {
      setMention((prev) =>
        prev.active ? { ...prev, active: false, query: '', anchorRect: null } : prev,
      );
    }
  };

  const handleMentionSelect = useCallback(
    (item: MentionChip) => {
      const tokenFn = MENTION_TOKEN[item.type];
      const token = tokenFn(item.value);
      const before = input.slice(0, mention.startPos);
      const after = input.slice(textareaRef.current?.selectionStart ?? input.length);
      const newText = `${before}${token}${after}`;
      setInput(newText);
      setMention({ active: false, type: 'file', query: '', startPos: -1, anchorRect: null });

      requestAnimationFrame(() => {
        const cursorPos = before.length + token.length;
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [input, mention.startPos],
  );

  const handleMentionClose = useCallback(() => {
    setMention({ active: false, type: 'file', query: '', startPos: -1, anchorRect: null });
  }, []);

  // Drag and drop
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

  // Paste handler
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
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

  const canSend = Boolean(input.trim() || attachments.length > 0) && !concurrencyLimitReached;

  return (
    <div className="shrink-0 border-t border-border bg-bg px-6 py-3">
      {/* Error toast */}
      {error && (
        <div className="mx-auto mb-2 max-w-3xl rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Concurrency limit warning */}
      {concurrencyLimitReached && (
        <div className="mx-auto mb-2 max-w-3xl rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          最多同时执行 5 个 Agent 任务，请等待完成后再试
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-1.5">
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
                className="ml-0.5 text-text-tertiary hover:text-text"
                aria-label={`Remove ${att.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={inputContainerRef}
        className={cn(
          'mx-auto flex max-w-3xl flex-col rounded-2xl border bg-bg px-3 py-3 shadow-whisper',
          dragOver ? 'border-primary bg-primary/5' : 'border-border',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex items-end gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-text-tertiary transition-colors cursor-pointer hover:border-border hover:bg-bg-hover hover:text-text"
            aria-label="Attach file"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder ?? 'Send a message...'}
            disabled={disabled}
            rows={1}
            className="max-h-40 min-h-[32px] flex-1 resize-none bg-transparent pt-1 text-[15px] leading-7 placeholder:text-text-tertiary focus:outline-none disabled:opacity-50"
          />

          {speechAvailable && (
            <button
              onClick={toggleListening}
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-colors cursor-pointer',
                isListening
                  ? 'text-red-500 animate-pulse'
                  : 'text-text-tertiary hover:border-border hover:bg-bg-hover hover:text-text',
              )}
              aria-label={isListening ? 'Stop listening' : 'Start voice input'}
              disabled={disabled}
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          {isStreaming && onStop ? (
            <button
              onClick={onStop}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-warm text-text-secondary transition-colors cursor-pointer hover:bg-bg-hover"
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !canSend}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors cursor-pointer',
                canSend
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-bg-warm text-text-tertiary',
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/80 pt-2">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            {permissionMode && onPermissionModeChange && (
              <PermissionModeSelector
                mode={permissionMode}
                onModeChange={onPermissionModeChange}
                onTogglePlanMode={onTogglePlanMode}
                shortcutLabel="Shift+Tab"
              />
            )}
            <span>Enter 发送</span>
            <span>Shift+Enter 换行</span>
          </div>
          <div className="text-[11px] text-text-tertiary">
            {permissionMode === 'plan' ? '计划模式已开启，只规划不执行' : '直接执行当前会话任务'}
          </div>
        </div>
      </div>

      {/* Unified mention popup */}
      {mention.active && (
        <MentionPopup
          type={mention.type}
          query={mention.query}
          anchorRect={mention.anchorRect}
          onSelect={handleMentionSelect}
          onClose={handleMentionClose}
        />
      )}
    </div>
  );
});
