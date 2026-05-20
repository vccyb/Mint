
import type { Attachment, MentionChip } from '@/types';

export interface MessageInputProps {
  onSend: (
    message: string,
    attachments?: Attachment[],
    mentionedTools?: MentionChip[],
    enableThinking?: boolean,
  ) => void;
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
  tokenUsage?: number;
  tokenBudget?: number;
  panelActive?: boolean;
  inputDisabled?: boolean;
  withContainer?: boolean;
  thinkingEnabled?: boolean;
  onThinkingToggle?: () => void;
  mode?: 'agent' | 'chat';
  projectId?: string | null;
}

export interface MessageInputHandle {
  focus: () => void;
}
