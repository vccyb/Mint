
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { getFileIcon } from '@/lib/file-icons';
import { ChangedFilesView } from './changed-files-view';
import type { ChangedFile } from './changed-files-view';
import {
  AllFilesView,
  SearchResultsView,
  type FilesData,
  type FileNode,
} from './file-tree-views';
import { SessionFilesSection } from './session-files-section';
import type { SessionFile } from '@/types';

// Re-exports
export { getFileIcon } from '@/lib/file-icons';
export { ChangedFilesView } from './changed-files-view';
export type { ChangedFile } from './changed-files-view';

type FileFilter = 'all' | 'changes';

interface FilePanelProps {
  hasProject?: boolean;
  projectId?: string | null;
  selectedFile?: string | null;
  onFileClick?: (path: string, name: string) => void;
  sessionId?: string | null;
  onSessionFileClick?: (file: SessionFile) => void;
  /** Change to trigger session files refresh */
  sessionFilesRefreshKey?: number;
}

export function FilePanel({
  hasProject = false,
  projectId = null,
  selectedFile,
  onFileClick,
  sessionId = null,
  onSessionFileClick,
  sessionFilesRefreshKey,
}: FilePanelProps) {
  const [data, setData] = useState<FilesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['.']));
  const [filter, setFilter] = useState<FileFilter>('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; path: string }[] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFiles = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!hasProject) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.filesList(projectId ? { projectId } : undefined);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [hasProject, projectId]);

  const fetchChanges = useCallback(async () => {
    const api = (window as any).electronAPI;
    try {
      const result = await api.filesChanges(projectId ? { projectId } : undefined);
      setChangedFiles(result.files ?? []);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
    fetchChanges();
  }, [fetchFiles, fetchChanges, projectId]);

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
        const api = (window as any).electronAPI;
        const result = await api.filesSearch({ q: searchQuery, projectId: projectId ?? undefined });
        setSearchResults(result.results ?? []);
      } catch {
        /* ignore */
      }
    }, 200);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, projectId]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Session Files Section — always shown */}
      <SessionFilesSection
        sessionId={sessionId}
        onFileClick={onSessionFileClick}
        refreshKey={sessionFilesRefreshKey}
      />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Workspace files section */}
      {!hasProject ? (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center py-8">
            <FolderOpen className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-xs text-text-tertiary">请先在左侧选择一个工程</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Workspace section header — unified style with session files */}
          <button
            onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
            className="flex items-center gap-1 px-3 py-1.5 w-full text-left hover:bg-bg-warm transition-colors cursor-pointer shrink-0"
          >
            {workspaceExpanded ? (
              <ChevronDown className="h-3 w-3 text-text-tertiary shrink-0" />
            ) : (
              <ChevronRight className="h-3 w-3 text-text-tertiary shrink-0" />
            )}
            <span className="text-xs font-semibold text-text">工程文件</span>
            {data && (
              <span className="text-[10px] text-text-tertiary truncate" title={data.root}>
                {data.projectName}
              </span>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-0.5 text-[10px] text-text-tertiary hover:text-text cursor-pointer px-1 py-0.5 rounded hover:bg-bg-warm/80 transition-colors"
                >
                  {filter === 'all' ? 'All' : 'Changed'}
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
                {showDropdown && (
                  <div className="absolute top-full right-0 mt-1 z-10 rounded border border-border bg-bg shadow-lg py-0.5 min-w-24">
                    <FilterItem
                      label="All Files"
                      value="all"
                      filter={filter}
                      onClick={() => {
                        setFilter('all');
                        setShowDropdown(false);
                      }}
                    />
                    <FilterItem
                      label={`Changed${changedFiles.length > 0 ? ` (${changedFiles.length})` : ''}`}
                      value="changes"
                      filter={filter}
                      onClick={() => {
                        setFilter('changes');
                        setShowDropdown(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  fetchFiles();
                  fetchChanges();
                }}
                className="text-text-tertiary hover:text-text cursor-pointer p-0.5 rounded hover:bg-bg-warm/80 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'spinner' : ''}`} />
              </button>
            </div>
          </button>

          {workspaceExpanded && (
            <>
              {/* Search bar - only in 'all' mode */}
              {filter === 'all' && (
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
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults(null);
                        }}
                        className="text-text-tertiary hover:text-text cursor-pointer shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto py-1 text-xs min-h-0">
                {isSearching ? (
                  <SearchResultsView
                    results={searchResults}
                    onFileClick={onFileClick}
                    selectedFile={selectedFile}
                  />
                ) : filter === 'all' ? (
                  <AllFilesView
                    data={data}
                    loading={loading}
                    error={error}
                    expanded={expanded}
                    onToggle={toggleDir}
                    onFileClick={onFileClick}
                    selectedFile={selectedFile}
                  />
                ) : (
                  <ChangedFilesView
                    files={changedFiles}
                    loading={loading}
                    onFileClick={onFileClick}
                    selectedFile={selectedFile}
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function FilterItem({
  label,
  value,
  filter,
  onClick,
}: {
  label: string;
  value: FileFilter;
  filter: FileFilter;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors ${
        filter === value
          ? 'bg-primary-light text-primary font-medium'
          : 'text-text-secondary hover:bg-bg-warm hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}
