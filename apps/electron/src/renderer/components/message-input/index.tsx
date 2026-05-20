
import { useImperativeHandle, forwardRef } from 'react';
import { ArrowUp, Square, Paperclip, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALLOWED_FILE_TYPES } from '@/lib/constants';
import { PermissionModeSelector } from '../permission-mode-selector';
import { RichInput } from '../rich-input/rich-input';
import '../rich-input/rich-input.css';
import { AttachmentChips } from './attachment-chips';
import { TokenUsageBar } from './token-usage-bar';
import { VoiceMicButton } from './voice-mic-button';
import { useMessageInput } from './use-message-input';
import type { MessageInputProps, MessageInputHandle } from './types';

export type { MessageInputHandle } from './types';

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(function MessageInput(
  props,
  ref,
) {
  const m = useMessageInput(props);

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (m.isAgentMode) {
        m.richInputRef.current?.focus();
      } else {
        m.textareaRef.current?.focus();
      }
    },
  }));

  const innerContent = (
    <>
      <div
        ref={m.inputContainerRef}
        className={cn(
          'mx-auto flex w-[80%] flex-col rounded-xl border bg-card overflow-hidden transition-all duration-150',
          m.isFocused && !m.dragOver
            ? 'border-primary shadow-[0_0_0_3px_rgba(0,122,255,0.08)]'
            : m.dragOver
              ? 'border-primary shadow-[0_0_0_1.5px_var(--primary)] scale-[1.005]'
              : 'border-border',
          (m.panelActive || m.inputDisabled) && 'opacity-50',
          m.panelActive && 'pointer-events-none',
        )}
        onDragEnter={m.handleDragEnter}
        onDragOver={m.handleDragOver}
        onDragLeave={m.handleDragLeave}
        onDrop={m.handleDrop}
      >
        {m.error && (
          <div className="mb-2 rounded border border-destructive/20 bg-destructive/8 px-3 py-1.5 text-xs text-destructive">
            {m.error}
          </div>
        )}
        {m.concurrencyLimitReached && (
          <div className="mb-2 rounded border border-warning/20 bg-warning/8 px-3 py-1.5 text-xs text-warning">
            最多同时执行 5 个 Agent 任务，请等待完成后再试
          </div>
        )}

        <AttachmentChips attachments={m.attachments} onRemove={m.removeAttachment} />

        <div className="flex items-end gap-2 px-3 pt-3 pb-1">
          <button
            onClick={() => m.fileInputRef.current?.click()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors cursor-pointer hover:text-text"
            aria-label="Attach file"
            disabled={m.disabled}
          >
            <Paperclip className="h-[14px] w-[14px]" />
          </button>
          <input
            ref={m.fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_FILE_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                m.addFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />

          {m.isAgentMode ? (
            <RichInput
              ref={m.richInputRef}
              placeholder={m.placeholder ?? '描述一个任务给 Agent 执行...'}
              projectId={m.projectId}
              disabled={m.disabled || m.inputDisabled}
              onSend={m.handleAgentSend}
              onUpdate={(text: string, hasText: boolean) => {
                m.setInput(text);
                m.setHasContent(hasText);
              }}
              onFocus={() => m.setIsFocused(true)}
              onBlur={() => m.setIsFocused(false)}
            />
          ) : (
            <textarea
              ref={m.textareaRef}
              value={m.input}
              onChange={m.handleTextareaChange}
              onKeyDown={m.handleKeyDown}
              onPaste={m.handlePaste}
              onFocus={() => m.setIsFocused(true)}
              onBlur={() => m.setIsFocused(false)}
              placeholder={m.placeholder ?? 'Send a message...'}
              disabled={m.disabled || m.inputDisabled}
              rows={1}
              className="max-h-40 min-h-[28px] w-full resize-none border-none bg-transparent py-1 text-[13px] leading-[20px] focus:outline-none focus:shadow-none focus:ring-0 disabled:opacity-50 placeholder:text-text-tertiary"
            />
          )}

          {m.recorderAvailable && (
            <VoiceMicButton
              state={m.voiceState}
              disabled={m.disabled}
              onClick={m.toggleRecording}
            />
          )}

          {m.isStreaming && m.onStop ? (
            <button
              onClick={m.onStop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-warm text-text-secondary transition-colors cursor-pointer hover:bg-bg-hover"
              aria-label="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={m.handleSendClick}
              disabled={m.disabled || !m.canSend}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 cursor-pointer',
                m.canSend
                  ? 'bg-primary text-white hover:bg-primary-hover hover:scale-[1.05] active:scale-[0.95] shadow-[0_2px_6px_rgba(0,122,255,0.3)]'
                  : 'bg-bg-hover text-text-tertiary',
              )}
              aria-label="Send message"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {(m.isListening || m.isProcessing) && m.interimText && (
          <div className="px-3 pb-1 text-xs text-text-tertiary italic">{m.interimText}</div>
        )}

        {m.voiceError && (
          <div className="mx-3 mb-1 rounded border border-destructive/20 bg-destructive/8 px-2 py-1 text-xs text-destructive">
            {m.voiceError}
          </div>
        )}

        <TokenUsageBar tokenUsage={m.tokenUsage ?? 0} tokenBudget={m.tokenBudget ?? 200000} />

        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/30 px-3 py-1.5">
          <div className="flex items-center gap-2">
            {m.onThinkingToggle && (
              <button
                onClick={m.onThinkingToggle}
                className={cn(
                  'flex h-5 items-center gap-1 rounded px-1.5 text-[10px] transition-colors cursor-pointer',
                  m.thinkingEnabled
                    ? 'bg-primary-light text-primary'
                    : 'text-text-tertiary hover:text-text hover:bg-bg-warm',
                )}
                title="Toggle thinking mode"
              >
                <Brain className="h-3 w-3" />
                <span>Thinking</span>
              </button>
            )}
            {m.permissionMode && m.onPermissionModeChange && (
              <PermissionModeSelector
                mode={m.permissionMode}
                onModeChange={m.onPermissionModeChange}
                onTogglePlanMode={m.onTogglePlanMode}
                shortcutLabel="Shift+Tab"
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-text-tertiary font-mono">
            <span>Enter 发送</span>
            <span className="text-border">·</span>
            <span>Shift+Enter 换行</span>
          </div>
        </div>
      </div>
    </>
  );

  if (!m.withContainer) {
    return innerContent;
  }

  return (
    <div
      className={cn(
        'shrink-0 bg-card px-6 py-3',
        m.panelActive && 'opacity-50 pointer-events-none',
      )}
    >
      {innerContent}
    </div>
  );
});
