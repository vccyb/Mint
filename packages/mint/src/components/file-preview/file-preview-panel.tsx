'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileCode, FileText, Image as ImageIcon, FileSpreadsheet, File } from 'lucide-react';
import { CodePreview } from './code-preview';
import { ImagePreview } from './image-preview';
import { HtmlPreview } from './html-preview';
import { MarkdownPreview } from './markdown-preview';
import { CsvPreview } from './csv-preview';
import { BinaryPlaceholder } from './binary-placeholder';

type PreviewType = 'code' | 'image' | 'html' | 'markdown' | 'csv' | 'binary';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  svg: 'image/svg+xml', webp: 'image/webp', ico: 'image/x-icon', bmp: 'image/bmp',
};

function getPreviewType(filename: string): PreviewType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md' || ext === 'mdx') return 'markdown';
  if (ext === 'csv') return 'csv';
  return 'code';
}

function getTypeIcon(type: PreviewType) {
  switch (type) {
    case 'image': return ImageIcon;
    case 'html': return FileCode;
    case 'markdown': return FileText;
    case 'csv': return FileSpreadsheet;
    default: return File;
  }
}

interface FilePreviewPanelProps {
  filePath: string;
  fileName: string;
  projectId: string | null;
  onClose: () => void;
}

export function FilePreviewPanel({ filePath, fileName, projectId, onClose }: FilePreviewPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [encoding, setEncoding] = useState<string>('text');
  const [mimeType, setMimeType] = useState<string>('');
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [language, setLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewType = getPreviewType(fileName);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ path: filePath });
      if (projectId) params.set('projectId', projectId);
      const res = await fetch(`/api/files/content?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to load' }));
        if (res.status === 415) {
          // Binary file — show placeholder
          setContent(null);
          setEncoding('binary');
        } else {
          setError(data.error ?? '加载失败');
        }
        return;
      }
      const data = await res.json();
      setContent(data.content);
      setEncoding(data.encoding ?? 'text');
      setMimeType(data.mimeType ?? '');
      setFileSize(data.size);
      setLanguage(data.language ?? '');
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [filePath, projectId]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const Icon = getTypeIcon(previewType);

  return (
    <div className="flex flex-col h-full border-l border-border bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-warm/30">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <span className="text-xs font-mono text-text-secondary truncate" title={filePath}>
            {filePath}
          </span>
          {language && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-warm text-text-tertiary shrink-0">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-bg-hover rounded transition-colors shrink-0 ml-2"
          aria-label="Close preview"
        >
          <X className="w-3.5 h-3.5 text-text-tertiary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="spinner-dot" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-tertiary">
            <FileWarning2Icon />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {!loading && !error && encoding === 'binary' && (
          <BinaryPlaceholder filename={fileName} size={fileSize} />
        )}

        {!loading && !error && content != null && previewType === 'code' && (
          <CodePreview content={content} filename={fileName} />
        )}

        {!loading && !error && content != null && previewType === 'image' && encoding === 'base64' && (
          <ImagePreview content={content} mimeType={mimeType || IMAGE_MIME[fileName.split('.').pop()?.toLowerCase() ?? ''] || 'image/png'} />
        )}

        {!loading && !error && content != null && previewType === 'html' && (
          <HtmlPreview content={content} />
        )}

        {!loading && !error && content != null && previewType === 'markdown' && (
          <MarkdownPreview content={content} />
        )}

        {!loading && !error && content != null && previewType === 'csv' && (
          <CsvPreview content={content} />
        )}
      </div>
    </div>
  );
}

function FileWarning2Icon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 18v-6" />
      <path d="m9 15 3-3 3 3" />
    </svg>
  );
}
