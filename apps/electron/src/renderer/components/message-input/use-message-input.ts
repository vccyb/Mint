
import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { ALLOWED_FILE_TYPES } from '@/lib/constants';
import type { Attachment } from '@/types';
import { RichInput, type RichInputHandle } from '../rich-input/rich-input';
import { useFileAttachments } from './use-file-attachments';
import { useVoiceInput } from './use-voice-input';
import { useSendHandlers } from './use-send-handlers';
import type { MessageInputProps } from './types';

export function useMessageInput(props: MessageInputProps) {
  const {
    onSend,
    disabled,
    externalValue,
    sessionKey,
    onTogglePlanMode,
    thinkingEnabled,
    mode = 'chat',
  } = props;

  const [input, setInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const richInputRef = useRef<RichInputHandle>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const sessionDraftsRef = useRef<Map<string, { input: string; attachments: Attachment[] }>>(
    new Map(),
  );

  const isAgentMode = mode === 'agent';
  const {
    attachments,
    setAttachments,
    error,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
  } = useFileAttachments(isAgentMode);
  const handleVoiceTranscript = useCallback(
    (fullText: string) => {
      setInput(fullText);
      setHasContent(fullText.trim().length > 0);
      if (isAgentMode) {
        richInputRef.current?.setContent(fullText);
      } else {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          }
        });
      }
    },
    [isAgentMode],
  );

  const { state: voiceState, isListening, isProcessing, voiceError, interimText, recorderAvailable, toggleRecording } =
    useVoiceInput({
      onTranscript: handleVoiceTranscript,
      getBaseText: () => input,
    });
  const { handleChatSend, handleAgentSend } = useSendHandlers({
    input,
    attachments,
    disabled,
    onSend,
    sessionKey,
    thinkingEnabled,
    setInput,
    clearAttachments,
    sessionDraftsRef,
  });

  // Auto-focus on mount
  useEffect(() => {
    if (isAgentMode) {
      richInputRef.current?.focus();
    } else {
      textareaRef.current?.focus();
    }
  }, [isAgentMode]);

  // Restore draft when session changes
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
  }, [sessionKey, isAgentMode, setAttachments]);

  // Save draft when input/attachments change
  useEffect(() => {
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input, attachments });
  }, [attachments, input, sessionKey]);

  // Handle externalValue (edit message)
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

  const canSend = Boolean(hasContent || attachments.length > 0);

  const handleSendClick = isAgentMode
    ? () => {
        const text = richInputRef.current?.getTextContent() ?? '';
        if (text.trim()) {
          handleAgentSend(text);
          richInputRef.current?.clear();
        }
      }
    : handleChatSend;

  return {
    ...props,
    input,
    setInput,
    dragOver,
    isFocused,
    setIsFocused,
    hasContent,
    setHasContent,
    textareaRef,
    richInputRef,
    inputContainerRef,
    isAgentMode,
    attachments,
    error,
    fileInputRef,
    addFiles,
    removeAttachment,
    isListening,
    isProcessing,
    voiceState,
    recorderAvailable,
    interimText,
    voiceError,
    toggleRecording,
    handleChatSend,
    handleAgentSend,
    handleKeyDown,
    handleTextareaChange,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    canSend,
    handleSendClick,
  };
}
