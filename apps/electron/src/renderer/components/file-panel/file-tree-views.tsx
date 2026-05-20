
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { getFileIcon } from '@/lib/file-icons';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FilesData {
  root: string;
  projectName: string;
  tree: FileNode[];
}

export function AllFilesView({
  data,
  loading,
  error,
  expanded,
  onToggle,
  onFileClick,
  selectedFile,
}: {
  data: FilesData | null;
  loading: boolean;
  error: string | null;
  expanded: Set<string>;
  onToggle: (p: string) => void;
  onFileClick?: (p: string, n: string) => void;
  selectedFile?: string | null;
}) {
  if (loading && !data)
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-3.5 w-3.5 spinner" />
        <span>Loading files...</span>
      </div>
    );
  if (error && !data)
    return (
      <div className="flex items-center gap-2 text-error px-3 py-4">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
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
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
}

export function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onFileClick,
  selectedFile,
}: {
  node: FileNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (p: string) => void;
  onFileClick?: (p: string, n: string) => void;
  selectedFile?: string | null;
}) {
  const isDir = node.type === 'directory';
  const isOpen = expanded.has(node.path);
  const sel = selectedFile === node.path;
  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-primary-light text-primary' : isDir ? 'text-text hover:bg-bg-warm' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => (isDir ? onToggle(node.path) : onFileClick?.(node.path, node.name))}
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
          (() => {
            const { Icon, color } = getFileIcon(node.name);
            return (
              <>
                <span className="w-3 shrink-0" />
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              </>
            );
          })()
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
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchResultsView({
  results,
  onFileClick,
  selectedFile,
}: {
  results: { name: string; path: string }[] | null;
  onFileClick?: (p: string, n: string) => void;
  selectedFile?: string | null;
}) {
  if (results === null)
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-3.5 w-3.5 spinner" />
        <span>搜索中...</span>
      </div>
    );
  if (results.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 text-text-tertiary py-8">
        <Search className="h-5 w-5" />
        <span className="text-[11px]">未找到匹配文件</span>
      </div>
    );
  return (
    <div>
      {results.map((r) => {
        const sel = selectedFile === r.path;
        const dir = r.path.includes('/') ? r.path.substring(0, r.path.lastIndexOf('/') + 1) : '';
        const { Icon, color } = getFileIcon(r.name);
        return (
          <div
            key={r.path}
            className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 cursor-pointer transition-colors ${sel ? 'bg-primary-light text-primary' : 'text-text-secondary hover:bg-bg-warm hover:text-text'}`}
            style={{ paddingLeft: '6px' }}
            onClick={() => onFileClick?.(r.path, r.name)}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
            <span className="truncate font-mono">{r.name}</span>
            {dir && <span className="truncate text-text-tertiary text-[10px] shrink-0">{dir}</span>}
          </div>
        );
      })}
    </div>
  );
}
