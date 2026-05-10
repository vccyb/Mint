'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileCode2,
  FileText,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Lock,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
  GitCommitHorizontal,
  Search,
  X,
} from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

// File icon system: map extension to icon component + color
const FILE_ICON_MAP: Record<string, { Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>; color: string }> = {
  // TypeScript / JavaScript
  ts: { Icon: FileCode2, color: 'text-blue-500' },
  tsx: { Icon: FileCode2, color: 'text-blue-500' },
  js: { Icon: FileCode2, color: 'text-yellow-500' },
  jsx: { Icon: FileCode2, color: 'text-yellow-500' },
  mjs: { Icon: FileCode2, color: 'text-yellow-500' },
  // Python
  py: { Icon: FileCode2, color: 'text-green-500' },
  pyi: { Icon: FileCode2, color: 'text-green-500' },
  // Other languages
  rs: { Icon: FileCode2, color: 'text-orange-600' },
  go: { Icon: FileCode2, color: 'text-cyan-500' },
  rb: { Icon: FileCode2, color: 'text-red-500' },
  java: { Icon: FileCode2, color: 'text-red-500' },
  swift: { Icon: FileCode2, color: 'text-orange-500' },
  kt: { Icon: FileCode2, color: 'text-purple-500' },
  // Config / Data
  json: { Icon: FileJson, color: 'text-yellow-600' },
  yaml: { Icon: FileText, color: 'text-orange-500' },
  yml: { Icon: FileText, color: 'text-orange-500' },
  toml: { Icon: FileText, color: 'text-orange-500' },
  xml: { Icon: FileText, color: 'text-orange-400' },
  // Web
  css: { Icon: FileCode, color: 'text-purple-500' },
  scss: { Icon: FileCode, color: 'text-pink-500' },
  less: { Icon: FileCode, color: 'text-purple-400' },
  html: { Icon: FileCode, color: 'text-orange-600' },
  htm: { Icon: FileCode, color: 'text-orange-600' },
  vue: { Icon: FileCode2, color: 'text-green-400' },
  svelte: { Icon: FileCode2, color: 'text-orange-400' },
  // Docs
  md: { Icon: FileText, color: 'text-gray-500' },
  mdx: { Icon: FileText, color: 'text-gray-500' },
  txt: { Icon: FileText, color: 'text-gray-400' },
  csv: { Icon: FileSpreadsheet, color: 'text-green-600' },
  // Images
  png: { Icon: ImageIcon, color: 'text-teal-500' },
  jpg: { Icon: ImageIcon, color: 'text-teal-500' },
  jpeg: { Icon: ImageIcon, color: 'text-teal-500' },
  gif: { Icon: ImageIcon, color: 'text-teal-500' },
  svg: { Icon: ImageIcon, color: 'text-teal-500' },
  webp: { Icon: ImageIcon, color: 'text-teal-500' },
  ico: { Icon: ImageIcon, color: 'text-teal-500' },
  // Shell
  sh: { Icon: FileCode2, color: 'text-green-400' },
  bash: { Icon: FileCode2, color: 'text-green-400' },
  zsh: { Icon: FileCode2, color: 'text-green-400' },
  // Lockfile / Env
  lock: { Icon: Lock, color: 'text-gray-400' },
  env: { Icon: Settings, color: 'text-gray-500' },
  // SQL
  sql: { Icon: FileCode2, color: 'text-blue-400' },
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICON_MAP[ext] ?? { Icon: File, color: 'text-text-tertiary' };
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
  /** 工程是否已选择 */
  hasProject?: boolean;
  /** 当前选中的工程 ID */
  projectId?: string | null;
  /** 当前选中的文件路径 */
  selectedFile?: string | null;
  /** 文件点击回调 */
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

export function FilePanel({
  hasProject = false,
  projectId = null,
  selectedFile,
  onFileClick,
}: FilePanelProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['.']));
  const [filter, setFilter] = useState<FileFilter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; path: string }[] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!hasProject) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = projectId ? `/api/files?projectId=${encodeURIComponent(projectId)}` : '/api/files';
      const res = await fetch(url);
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j.error) detail = j.error; } catch { /* ignore */ }
        throw new Error(detail);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [hasProject, projectId]);

  const fetchChanges = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      const res = await fetch(`/api/files/changes?${params.toString()}`);
      if (!res.ok) return;
      const json = await res.json();
      setChangedFiles(json.files ?? []);
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { fetchFiles(); fetchChanges(); }, [fetchFiles, fetchChanges, projectId]);

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

  // Debounced file search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: searchQuery });
        if (projectId) params.append('projectId', projectId);
        const res = await fetch(`/api/files/search?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        setSearchResults(json.results ?? []);
      } catch { /* ignore */ }
    }, 200);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, projectId]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg shrink-0">
        {!hasProject ? (
          <span className="text-xs font-semibold text-text-tertiary">未选择工程</span>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 text-xs font-semibold text-text cursor-pointer"
            >
              {filter === 'all' ? 'All Files' : 'Changed'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 z-10 rounded border border-border bg-bg shadow-lg py-0.5 min-w-24">
                <FilterItem label="All Files" value="all" filter={filter} onClick={() => { setFilter('all'); setShowDropdown(false); }} />
                <FilterItem label={`Changed${changedFiles.length > 0 ? ` (${changedFiles.length})` : ''}`} value="changes" filter={filter} onClick={() => { setFilter('changes'); setShowDropdown(false); }} />
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {data && (
            <span className="text-[10px] text-text-tertiary truncate mr-2" title={data.root}>{data.projectName}</span>
          )}
          <button onClick={() => { fetchFiles(); fetchChanges(); }} className="text-text-tertiary hover:text-text cursor-pointer" disabled={loading || !hasProject}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'spinner' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search bar - only in 'all' mode */}
      {filter === 'all' && hasProject && (
        <div className="px-2 py-1.5 border-b border-border shrink-0">
          <div className="flex items-center gap-1.5 bg-bg-warm rounded px-2 py-1">
            <Search className="h-3 w-3 text-text-tertiary shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索文件..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-text-tertiary min-w-0"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults(null); }} className="text-text-tertiary hover:text-text cursor-pointer shrink-0">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* File tree */}
      {!hasProject ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center py-8">
            <FolderOpen className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-xs text-text-tertiary">请先在左侧选择一个工程</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1 text-xs min-h-0">
          {isSearching ? (
            <SearchResultsView results={searchResults} onFileClick={onFileClick} selectedFile={selectedFile} />
          ) : filter === 'all' ? (
            <AllFilesView data={data} loading={loading} error={error} expanded={expanded} onToggle={toggleDir} onFileClick={onFileClick} selectedFile={selectedFile} />
          ) : (
            <ChangedFilesView files={changedFiles} loading={loading} onFileClick={onFileClick} selectedFile={selectedFile} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterItem({ label, value, filter, onClick }: {
  label: string; value: FileFilter; filter: FileFilter; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
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
    const arr = grouped.get(dir) ?? [];
    arr.push(f);
    if (!grouped.has(dir)) grouped.set(dir, arr);
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
                {(() => { const { Icon, color } = getFileIcon(name); return <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />; })()}
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
        ) : (() => { const { Icon, color } = getFileIcon(node.name); return (<><span className="w-3 shrink-0" /><Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} /></>); })()}
        <span className="truncate font-mono">{node.name}</span>
      </div>
      {isDir && isOpen && node.children && <div>{node.children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onFileClick={onFileClick} selectedFile={selectedFile} />)}</div>}
    </div>
  );
}

function SearchResultsView({ results, onFileClick, selectedFile }: {
  results: { name: string; path: string }[] | null;
  onFileClick?: (p: string, n: string) => void; selectedFile?: string | null;
}) {
  if (results === null) return <div className="flex items-center justify-center gap-2 text-text-tertiary py-8"><Loader2 className="h-3.5 w-3.5 spinner" /><span>搜索中...</span></div>;
  if (results.length === 0) return <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary py-8"><Search className="h-5 w-5" /><span className="text-[11px]">未找到匹配文件</span></div>;
  return (
    <div>
      {results.map((r) => {
        const sel = selectedFile === r.path;
        const dir = r.path.includes('/') ? r.path.substring(0, r.path.lastIndexOf('/') + 1) : '';
        const { Icon, color } = getFileIcon(r.name);
        return (
          <div key={r.path} className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-[#E8F2FF] text-[#007AFF]' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`} style={{ paddingLeft: '6px' }} onClick={() => onFileClick?.(r.path, r.name)}>
            <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
            <span className="truncate font-mono">{r.name}</span>
            {dir && <span className="truncate text-text-tertiary text-[10px] shrink-0">{dir}</span>}
          </div>
        );
      })}
    </div>
  );
}
