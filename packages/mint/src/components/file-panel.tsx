'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  Loader2,
  AlertCircle,
  RefreshCw,
  GitCommitHorizontal,
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked' | 'renamed';
}

interface FilesData {
  root: string;
  projectName: string;
  tree: FileNode[];
}

type FileFilter = 'all' | 'changes';

interface FilePanelProps {
  onClose: () => void;
  onFileClick?: (path: string, name: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  added: 'text-green-500',
  modified: 'text-amber-500',
  deleted: 'text-red-500',
  untracked: 'text-blue-500',
  renamed: 'text-purple-500',
};

const STATUS_LABELS: Record<string, string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  untracked: 'U',
  renamed: 'R',
};

export function FilePanel({ onClose, onFileClick }: FilePanelProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['.']));
  const [filter, setFilter] = useState<FileFilter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch('/api/files/changes');
      if (!res.ok) return;
      const json = await res.json();
      setChangedFiles(json.files ?? []);
    } catch {
      // not a git repo — keep empty
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchChanges();
  }, [fetchFiles, fetchChanges]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg">
        <div className="flex items-center gap-2 min-w-0">
          {/* Filter dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 text-xs font-semibold text-text hover:text-text transition-colors cursor-pointer"
            >
              {filter === 'all' ? 'All Files' : 'Changed'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 z-10 rounded border border-border bg-bg shadow-lg py-0.5 min-w-28">
                <button
                  onClick={() => {
                    setFilter('all');
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    filter === 'all'
                      ? 'bg-bg-warm text-text font-medium'
                      : 'text-text-secondary hover:bg-bg-warm hover:text-text'
                  }`}
                >
                  All Files
                </button>
                <button
                  onClick={() => {
                    setFilter('changes');
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    filter === 'changes'
                      ? 'bg-bg-warm text-text font-medium'
                      : 'text-text-secondary hover:bg-bg-warm hover:text-text'
                  }`}
                >
                  Changed
                  {changedFiles.length > 0 && (
                    <span className="ml-1.5 text-[10px] text-text-tertiary">
                      ({changedFiles.length})
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
          {data && (
            <span className="text-[10px] text-text-tertiary truncate" title={data.root}>
              {data.projectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              fetchFiles();
              fetchChanges();
            }}
            className="text-text-tertiary hover:text-text transition-colors cursor-pointer"
            aria-label="Refresh files"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'spinner' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text transition-colors cursor-pointer"
            aria-label="Close file panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1 text-xs relative">
        {filter === 'all' ? (
          <AllFilesView
            data={data}
            loading={loading}
            error={error}
            expanded={expanded}
            onToggle={toggleDir}
            onFileClick={onFileClick}
          />
        ) : (
          <ChangedFilesView
            files={changedFiles}
            loading={loading}
            onFileClick={onFileClick}
          />
        )}
      </div>
    </div>
  );
}

/* ── All files tree ──────────────────────────────────── */

function AllFilesView({
  data,
  loading,
  error,
  expanded,
  onToggle,
  onFileClick,
}: {
  data: FilesData | null;
  loading: boolean;
  error: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onFileClick?: (path: string, name: string) => void;
}) {
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-3.5 w-3.5 spinner" />
        <span>Loading files...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center gap-2 text-error px-3 py-4">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      {data.tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          onToggle={onToggle}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}

/* ── Changed files list ──────────────────────────────── */

function ChangedFilesView({
  files,
  loading,
  onFileClick,
}: {
  files: ChangedFile[];
  loading: boolean;
  onFileClick?: (path: string, name: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-3.5 w-3.5 spinner" />
        <span>Loading changes...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary py-8">
        <GitCommitHorizontal className="h-5 w-5" />
        <span className="text-[11px]">No changes detected</span>
      </div>
    );
  }

  // Group by directory
  const grouped = new Map<string, ChangedFile[]>();
  for (const f of files) {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    const list = grouped.get(dir) ?? [];
    list.push(f);
    grouped.set(dir, list);
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
            return (
              <div
                key={f.path}
                className="flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer transition-colors text-text-secondary hover:bg-bg-warm hover:text-text"
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
                <File className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                <span className="truncate font-mono">{name}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Tree node ───────────────────────────────────────── */

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onFileClick,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onFileClick?: (path: string, name: string) => void;
}) {
  const isDir = node.type === 'directory';
  const isOpen = expanded.has(node.path);

  const handleClick = () => {
    if (isDir) {
      onToggle(node.path);
    } else {
      onFileClick?.(node.path, node.name);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${
          isDir
            ? 'text-text hover:bg-bg-warm'
            : 'text-text-secondary hover:bg-bg-warm hover:text-text'
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={handleClick}
      >
        {isDir ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />
            )}
            {isOpen ? (
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <File className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          </>
        )}
        <span className="truncate font-mono">{node.name}</span>
      </div>

      {isDir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
