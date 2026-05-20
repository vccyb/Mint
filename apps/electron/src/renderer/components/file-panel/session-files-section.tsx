
import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { getFileIcon } from '@/lib/file-icons';
import { FileUploadZone } from './file-upload-zone';
import type { SessionFile } from '@/types';

interface SessionFilesSectionProps {
  sessionId: string | null;
  onFileClick?: (file: SessionFile) => void;
  /** Change this value to trigger a refresh (e.g. after sending a message) */
  refreshKey?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function SessionFilesSection({ sessionId, onFileClick, refreshKey }: SessionFilesSectionProps) {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!sessionId) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      const json = await api.listSessionFiles(sessionId);
      setFiles(json.files ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshKey]);

  const handleUpload = useCallback(
    async (fileList: FileList) => {
      const api = (window as any).electronAPI;
      if (!sessionId) return;
      setUploading(true);
      try {
        for (const f of Array.from(fileList)) {
          const buffer = await f.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ''),
          );
          const result = await api.sessionFilesUpload(sessionId, {
            name: f.name,
            data: base64,
            mimeType: f.type || undefined,
          });
          if (result) {
            setFiles((prev) => [...prev, result]);
          }
        }
      } catch {
        /* ignore */
      } finally {
        setUploading(false);
      }
    },
    [sessionId],
  );

  const handleDelete = useCallback(
    async (fileId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const api = (window as any).electronAPI;
      if (!sessionId) return;
      try {
        await api.sessionFilesDelete(sessionId, fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch {
        /* ignore */
      }
    },
    [sessionId],
  );

  return (
    <div className="flex flex-col shrink-0">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 px-3 py-1.5 w-full text-left hover:bg-bg-warm transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-text-tertiary shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-text-tertiary shrink-0" />
        )}
        <span className="text-xs font-semibold text-text">会话文件</span>
        {files.length > 0 && (
          <span className="text-[10px] text-text-tertiary ml-1">({files.length})</span>
        )}
      </button>

      {expanded && (
        <div className="px-2 pb-2">
          {loading && files.length === 0 ? (
            <div className="text-[10px] text-text-tertiary text-center py-2">加载中...</div>
          ) : (
            <>
              {/* File list */}
              {files.length > 0 && (
                <div className="mb-2">
                  {files.map((file) => {
                    const icon = getFileIcon(file.name);
                    return (
                      <div
                        key={file.id}
                        onClick={() => onFileClick?.(file)}
                        className="group flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-bg-warm cursor-pointer transition-colors"
                      >
                        <icon.Icon className={`h-3.5 w-3.5 shrink-0 ${icon.color}`} />
                        <span className="text-xs text-text truncate flex-1 min-w-0" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-text-tertiary shrink-0">
                          {formatSize(file.size)}
                        </span>
                        <button
                          onClick={(e) => handleDelete(file.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-red-500 transition-opacity shrink-0 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Upload zone */}
              <FileUploadZone
                onFilesSelected={handleUpload}
                label={uploading ? '上传中...' : '拖拽文件到此处'}
                secondaryText="或点击选择文件"
                compact
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
