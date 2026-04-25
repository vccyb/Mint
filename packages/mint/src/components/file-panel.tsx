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
import { DiffView } from './diff-view';

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
  onClose?: () => void;
  onFileClick?: (path: string, name: string) => void;
  fullscreen?: boolean;
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

export function FilePanel({
  onClose,
  onFileClick,
  fullscreen = false,
}: FilePanelProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['.']));
  const [filter, setFilter] = useState<FileFilter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/files');
      if (!res.ok) throw new Error('Failed to fetch files');
      setData(await res.json());
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
    } catch { /* ignore */ }
  }, []);

  const fetchDiff = useCallback(async (filePath: string) => {
    setDiffLoading(true);
    try {
      const res = await fetch(`/api/files/diff?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) { setDiffContent(null); return; }
      const text = await res.text();
      setDiffContent(text || null);
    } catch { setDiffContent(null); } finally { setDiffLoading(false); }
  }, []);

  const fetchContent = useCallback(async (filePath: string) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) { setPreviewContent(null); return; }
      const json = await res.json();
      setPreviewContent(json.content ?? null);
      setPreviewLanguage(json.language ?? 'plaintext');
    } catch { setPreviewContent(null); } finally { setPreviewLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); fetchChanges(); }, [fetchFiles, fetchChanges]);

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
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const handleFileClick = (path: string, name: string) => {
    setSelectedFile(path);
    if (fullscreen) {
      // Clear previous content before fetching new
      setDiffContent(null);
      setPreviewContent(null);
      if (filter === 'changes') {
        fetchDiff(path);
      } else {
        fetchContent(path);
      }
    }
    onFileClick?.(path, name);
  };

  const refreshAll = () => { fetchFiles(); fetchChanges(); };

  const textSize = fullscreen ? 'text-[10px]' : 'text-xs';
  const headerPad = fullscreen ? 'px-2 py-1.5' : 'px-3 py-2';

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between ${headerPad} border-b border-border bg-bg shrink-0`}>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-1 ${textSize} font-semibold text-text cursor-pointer`}
          >
            {filter === 'all' ? 'All Files' : 'Changed'}
            <ChevronDown className={fullscreen ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 z-10 rounded border border-border bg-bg shadow-lg py-0.5 min-w-24">
              <FilterItem label="All Files" value="all" filter={filter} onClick={() => { setFilter('all'); setSelectedFile(null); setDiffContent(null); setShowDropdown(false); }} compact={fullscreen} />
              <FilterItem label={`Changed${changedFiles.length > 0 ? ` (${changedFiles.length})` : ''}`} value="changes" filter={filter} onClick={() => { setFilter('changes'); setSelectedFile(null); setPreviewContent(null); setShowDropdown(false); }} compact={fullscreen} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!fullscreen && data && (
            <span className="text-[10px] text-text-tertiary truncate mr-2" title={data.root}>{data.projectName}</span>
          )}
          <button onClick={refreshAll} className="text-text-tertiary hover:text-text cursor-pointer" disabled={loading}>
            <RefreshCw className={`${fullscreen ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${loading ? 'spinner' : ''}`} />
          </button>
          {onClose && (
            <button onClick={onClose} className="text-text-tertiary hover:text-text cursor-pointer" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {fullscreen ? (
        /* Fullscreen: side-by-side layout — file tree left, diff/preview right */
        <div className="flex flex-1 min-h-0">
          {/* File tree */}
          <div className={`w-[200px] shrink-0 border-r border-border overflow-y-auto py-0.5 text-[10px]`}>
            {filter === 'all' ? (
              <AllFilesView data={data} loading={loading} error={error} expanded={expanded} onToggle={toggleDir} onFileClick={handleFileClick} selectedFile={selectedFile} />
            ) : (
              <ChangedFilesView files={changedFiles} loading={loading} onFileClick={handleFileClick} selectedFile={selectedFile} />
            )}
          </div>

          {/* Content area: diff for "changes", raw content for "all" */}
          <div className="flex-1 min-h-0 overflow-auto">
            {filter === 'changes' ? (
              selectedFile && diffContent ? (
                <DiffView content={diffContent} />
              ) : selectedFile && diffLoading ? (
                <div className="flex items-center justify-center py-4 text-text-tertiary">
                  <Loader2 className="h-3 w-3 spinner" />
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-text-tertiary text-[10px]">
                  选择文件查看变更
                </div>
              )
            ) : (
              selectedFile && previewContent ? (
                <FileContentView content={previewContent} language={previewLanguage} />
              ) : selectedFile && previewLoading ? (
                <div className="flex items-center justify-center py-4 text-text-tertiary">
                  <Loader2 className="h-3 w-3 spinner" />
                </div>
              ) : (
                <div className="flex items-center justify-center py-6 text-text-tertiary text-[10px]">
                  选择文件查看内容
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        /* Sidebar: file tree only */
        <div className="flex-1 overflow-y-auto py-1 text-xs min-h-0">
          {filter === 'all' ? (
            <AllFilesView data={data} loading={loading} error={error} expanded={expanded} onToggle={toggleDir} onFileClick={handleFileClick} selectedFile={selectedFile} />
          ) : (
            <ChangedFilesView files={changedFiles} loading={loading} onFileClick={handleFileClick} selectedFile={selectedFile} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterItem({ label, value, filter, onClick, compact }: {
  label: string; value: FileFilter; filter: FileFilter; onClick: () => void; compact: boolean;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} cursor-pointer transition-colors ${
      filter === value ? 'bg-[#E8F2FF] text-[#007AFF] font-medium' : 'text-text-secondary hover:bg-bg-warm hover:text-text'
    }`}>
      {label}
    </button>
  );
}

function AllFilesView({ data, loading, error, expanded, onToggle, onFileClick, selectedFile }: {
  data: FilesData | null; loading: boolean; error: string | null;
  expanded: Set<string>; onToggle: (p: string) => void;
  onFileClick?: (p: string, n: string) => void; selectedFile?: string | null;
}) {
  if (loading && !data) return <div className="flex items-center justify-center gap-2 text-text-tertiary py-8"><Loader2 className="h-3.5 w-3.5 spinner" /><span>Loading files...</span></div>;
  if (error && !data) return <div className="flex items-center gap-2 text-error px-3 py-4"><AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{error}</span></div>;
  if (!data) return null;
  return (
    <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
      {data.tree.map((node) => <TreeNode key={node.path} node={node} depth={0} expanded={expanded} onToggle={onToggle} onFileClick={onFileClick} selectedFile={selectedFile} />)}
    </div>
  );
}

function ChangedFilesView({ files, loading, onFileClick, selectedFile }: {
  files: ChangedFile[]; loading: boolean;
  onFileClick?: (p: string, n: string) => void; selectedFile?: string | null;
}) {
  if (loading) return <div className="flex items-center justify-center gap-2 text-text-tertiary py-8"><Loader2 className="h-3.5 w-3.5 spinner" /><span>Loading changes...</span></div>;
  if (files.length === 0) return <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary py-8"><GitCommitHorizontal className="h-5 w-5" /><span className="text-[11px]">No changes detected</span></div>;
  const grouped = new Map<string, ChangedFile[]>();
  for (const f of files) {
    const parts = f.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    (grouped.get(dir) ?? []).push(f);
    if (!grouped.has(dir)) grouped.set(dir, [f]);
  }
  return (
    <div>
      {Array.from(grouped.entries()).map(([dir, dirFiles]) => (
        <div key={dir}>
          {dir !== '.' && <div className="px-2 py-0.5 text-[10px] text-text-tertiary font-mono truncate">{dir}/</div>}
          {dirFiles.map((f) => {
            const name = f.path.split('/').pop() ?? f.path;
            const sel = selectedFile === f.path;
            return (
              <div key={f.path} className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-[#E8F2FF] text-[#007AFF]' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`} style={{ paddingLeft: dir !== '.' ? '20px' : '6px' }} onClick={() => { if (f.status !== 'deleted') onFileClick?.(f.path, name); }}>
                <span className={`shrink-0 text-[10px] font-bold font-mono w-3 text-center ${STATUS_COLORS[f.status] ?? 'text-text-tertiary'}`} title={f.status}>{STATUS_LABELS[f.status] ?? '?'}</span>
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

function TreeNode({ node, depth, expanded, onToggle, onFileClick, selectedFile }: {
  node: FileNode; depth: number; expanded: Set<string>;
  onToggle: (p: string) => void; onFileClick?: (p: string, n: string) => void;
  selectedFile?: string | null;
}) {
  const isDir = node.type === 'directory';
  const isOpen = expanded.has(node.path);
  const sel = selectedFile === node.path;
  return (
    <div>
      <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-[#E8F2FF] text-[#007AFF]' : isDir ? 'text-text hover:bg-bg-warm' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`} style={{ paddingLeft: `${depth * 12 + 6}px` }} onClick={() => isDir ? onToggle(node.path) : onFileClick?.(node.path, node.name)}>
        {isDir ? (
          <>{isOpen ? <ChevronDown className="h-3 w-3 shrink-0 text-text-tertiary" /> : <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />}{isOpen ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />}</>
        ) : (<><span className="w-3 shrink-0" /><File className="h-3.5 w-3.5 shrink-0 text-text-tertiary" /></>)}
        <span className="truncate font-mono">{node.name}</span>
      </div>
      {isDir && isOpen && node.children && <div>{node.children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onFileClick={onFileClick} selectedFile={selectedFile} />)}</div>}
    </div>
  );
}

/** Renders raw file content with line numbers */
function FileContentView({ content, language }: { content: string; language: string }) {
  const lines = content.split('\n');
  return (
    <div className="font-mono text-[11px] leading-relaxed bg-bg-warm">
      <div className="px-3 py-1 bg-bg text-text-tertiary text-[10px] border-b border-border">
        {language}
      </div>
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-[#F5F5F7]/60">
          <span className="w-10 shrink-0 text-right pr-3 text-text-tertiary select-none text-[10px]">
            {i + 1}
          </span>
          <span className="flex-1 text-text-secondary whitespace-pre">{line}</span>
        </div>
      ))}
    </div>
  );
}
