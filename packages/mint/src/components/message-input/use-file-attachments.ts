'use client';

import { useState, useCallback, useRef } from 'react';
import { isTextFile, isPdfFile } from '@/lib/attachment-utils';
import { ALLOWED_FILE_TYPES } from '@/lib/constants';
import type { Attachment } from '@/types';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function readFileAsAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const isImage = file.type.startsWith('image/');
    const isText = !isImage && isTextFile(file.type, file.name);
    const isPdf = !isImage && !isText && isPdfFile(file.type, file.name);

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

export function useFileAttachments(isAgentMode: boolean) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const unsupported = fileArray.find(
        (f) =>
          !f.type.startsWith('image/') && !isTextFile(f.type, f.name) && !isPdfFile(f.type, f.name),
      );
      if (unsupported) {
        showError(
          `"${unsupported.name}" is not a supported file type. Use text, code, or image files.`,
        );
        return;
      }

      try {
        const newAttachments = await Promise.all(fileArray.map(readFileAsAttachment));
        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (err) {
        showError(err instanceof Error ? err.message : 'Failed to read file');
      }
    },
    [attachments.length, isAgentMode, showError],
  );

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => setAttachments([]), []);

  return {
    attachments,
    setAttachments,
    error,
    fileInputRef,
    addFiles,
    removeAttachment,
    clearAttachments,
  };
}

export { ALLOWED_FILE_TYPES };
