'use client';

import { Loader2, GitCommitHorizontal } from 'lucide-react';
import { getFileIcon } from '@/lib/file-icons';

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'renamed';
}

export const STATUS_COLORS: Record<string, string> = {
  added: 'text-green-500',
  modified: 'text-amber-500',
  deleted: 'text-red-500',
  untracked: 'text-blue-500',
  renamed: 'text-purple-500',
};

export const STATUS_LABELS: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  untracked: 'U',
  renamed: 'R',
};

export function ChangedFilesView({
  files,
  loading,
  onFileClick,
  selectedFile,
}: {
  files: ChangedFile[];
  loading: boolean;
  onFileClick?: (p: string, n: string) => void;
  selectedFile?: string | null;
}) {
  if (loading)
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-3.5 w-3.5 spinner" />
        <span>Loading changes...</span>
      </div>
    );
  if (files.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary py-8">
        <GitCommitHorizontal className="h-5 w-5" />
        <span className="text-[11px]">No changes detected</span>
      </div>
    );
  const grouped = new Map<string, ChangedFile[]>();
  for (const f of files) {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    const arr = grouped.get(dir) ?? [];
    arr.push(f);
    if (!grouped.has(dir)) grouped.set(dir, arr);
  }
  return (
    <div>
      {Array.from(grouped.entries()).map(([dir, dirFiles]) => (
        <div key={dir}>
          {dir !== '.' && (
            <div className="px-2 py-0.5 text-[10px] text-text-tertiary font-mono truncate">
              {dir}/
            </div>
          )}
          {dirFiles.map((f) => {
            const name = f.path.split('/').pop() ?? f.path;
            const sel = selectedFile === f.path;
            return (
              <div
                key={f.path}
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`}
                style={{ paddingLeft: dir !== '.' ? '20px' : '6px' }}
                onClick={() => {
                  if (f.status !== 'deleted') onFileClick?.(f.path, name);
                }}
              >
                <span
                  className={`shrink-0 text-[10px] font-bold font-mono w-3 text-center ${STATUS_COLORS[f.status] ?? 'text-text-tertiary'}`}
                  title={f.status}
                >
                  {STATUS_LABELS[f.status] ?? '?'}
                </span>
                {(() => {
                  const { Icon, color } = getFileIcon(name);
                  return <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />;
                })()}
                <span className="truncate font-mono">{name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
