'use client';

import { useCallback } from 'react';
import type { Attachment, MentionChip } from '@/types';
import { extractMentions } from '@/types';

async function fetchMentionedFileContent(filePath: string): Promise<string | null> {
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
}

export async function resolveFileMentions(
  text: string,
  existingAttachments: Attachment[],
): Promise<{ finalAttachments: Attachment[] | undefined; nonFileMentions: MentionChip[] }> {
  const allMentions = extractMentions(text);
  const fileMentions = allMentions.filter((m) => m.type === 'file');
  const nonFileMentions = allMentions.filter((m) => m.type !== 'file');

  let finalAttachments = existingAttachments.length > 0 ? [...existingAttachments] : undefined;

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

  return { finalAttachments, nonFileMentions };
}

interface UseSendHandlersParams {
  input: string;
  attachments: Attachment[];
  disabled?: boolean;
  onSend: (
    message: string,
    attachments?: Attachment[],
    mentionedTools?: MentionChip[],
    enableThinking?: boolean,
  ) => void;
  sessionKey?: string | null;
  thinkingEnabled?: boolean;
  setInput: (v: string) => void;
  clearAttachments: () => void;
  sessionDraftsRef: React.RefObject<Map<string, { input: string; attachments: Attachment[] }>>;
}

export function useSendHandlers({
  input,
  attachments,
  disabled,
  onSend,
  sessionKey,
  thinkingEnabled,
  setInput,
  clearAttachments,
  sessionDraftsRef,
}: UseSendHandlersParams) {
  const handleChatSend = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;

    const { finalAttachments, nonFileMentions } = await resolveFileMentions(trimmed, attachments);

    onSend(
      trimmed,
      finalAttachments,
      nonFileMentions.length > 0 ? nonFileMentions : undefined,
      thinkingEnabled,
    );
    const key = sessionKey ?? '__default__';
    sessionDraftsRef.current.set(key, { input: '', attachments: [] });
    setInput('');
    clearAttachments();
  }, [
    input,
    attachments,
    disabled,
    onSend,
    sessionKey,
    thinkingEnabled,
    clearAttachments,
    sessionDraftsRef,
    setInput,
  ]);

  const handleAgentSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || disabled) return;

      const { finalAttachments, nonFileMentions } = await resolveFileMentions(trimmed, attachments);

      onSend(
        trimmed,
        finalAttachments,
        nonFileMentions.length > 0 ? nonFileMentions : undefined,
        thinkingEnabled,
      );
      const key = sessionKey ?? '__default__';
      sessionDraftsRef.current.set(key, { input: '', attachments: [] });
      setInput('');
      clearAttachments();
    },
    [
      attachments,
      disabled,
      onSend,
      sessionKey,
      thinkingEnabled,
      clearAttachments,
      sessionDraftsRef,
      setInput,
    ],
  );

  return { handleChatSend, handleAgentSend };
}
