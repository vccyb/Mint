'use client';

import { FileWarning } from 'lucide-react';

interface BinaryPlaceholderProps {
  filename: string;
  size?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BinaryPlaceholder({ filename, size }: BinaryPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-text-tertiary">
      <FileWarning className="w-8 h-8" />
      <div className="text-sm font-medium text-text-secondary">{filename}</div>
      <div className="text-xs">该文件类型暂不支持预览</div>
      {size != null && <div className="text-[11px]">文件大小: {formatSize(size)}</div>}
    </div>
  );
}
