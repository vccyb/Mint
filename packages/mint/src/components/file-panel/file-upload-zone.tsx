'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  label?: string;
  secondaryText?: string;
  compact?: boolean;
}

export function FileUploadZone({
  onFilesSelected,
  accept,
  label = '拖拽文件到此处',
  secondaryText,
  compact = false,
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesSelected(e.dataTransfer.files);
      }
    },
    [onFilesSelected],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected(e.target.files);
      }
      e.target.value = '';
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`
        border border-dashed rounded-md transition-colors cursor-pointer
        ${compact ? 'px-2 py-2' : 'px-3 py-3'}
        ${dragOver ? 'border-primary bg-primary-light/50' : 'border-border hover:border-primary/40'}
      `}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-1 text-center">
        <Upload className={`text-text-tertiary ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-text-tertiary`}>
          {label}
        </span>
        {secondaryText && (
          <span className="text-[10px] text-text-tertiary/70">{secondaryText}</span>
        )}
      </div>
    </div>
  );
}
