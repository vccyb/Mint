'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Check, FolderOpen, ChevronLeft, RefreshCw, Home } from 'lucide-react';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, projectPath: string) => Promise<void>;
}

interface DirEntry {
  name: string;
  path: string;
}

interface BrowseResult {
  currentPath: string;
  parentPath: string | null;
  entries: DirEntry[];
}

export function NewProjectDialog({ open, onClose, onConfirm }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [browsePath, setBrowsePath] = useState('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const browse = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/filesystem?dir=${encodeURIComponent(dir)}`);
      if (res.ok) {
        const data: BrowseResult = await res.json();
        setEntries(data.entries);
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setBrowsePath(data.currentPath);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) browse('~');
  }, [open, browse]);

  const handleSelectDir = (entry: DirEntry) => {
    setSelectedPath(entry.path);
    setName(entry.name);
  };

  const handleNavigate = (path: string) => {
    browse(path);
  };

  const handleGoToPath = () => {
    if (browsePath.trim()) browse(browsePath.trim());
  };

  const handleConfirm = async () => {
    if (!name.trim() || !selectedPath) return;
    setIsCreating(true);
    try {
      await onConfirm(name.trim(), selectedPath);
      setName('');
      setSelectedPath('');
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedPath('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg rounded-lg shadow-lg w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text">新建工程</h2>
          <button onClick={handleClose} className="text-text-tertiary hover:text-text transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Path bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 shrink-0">
          <button
            onClick={() => browse('/Users')}
            className="p-1 rounded hover:bg-bg-warm text-text-tertiary hover:text-text transition-colors cursor-pointer"
            title="Home"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => parentPath && browse(parentPath)}
            disabled={!parentPath}
            className="p-1 rounded hover:bg-bg-warm text-text-tertiary hover:text-text transition-colors cursor-pointer disabled:opacity-30"
            title="Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => browse(currentPath)}
            className="p-1 rounded hover:bg-bg-warm text-text-tertiary hover:text-text transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex-1 flex items-center gap-1 px-2 py-1 bg-bg-warm rounded text-xs font-mono text-text-secondary overflow-hidden">
            <span className="truncate">{currentPath}</span>
          </div>
          <input
            type="text"
            value={browsePath}
            onChange={(e) => setBrowsePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGoToPath()}
            placeholder="输入路径后回车跳转"
            className="hidden sm:block w-48 px-2 py-1 border border-border rounded text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-1">
          {entries.map((entry) => (
            <button
              key={entry.path}
              onClick={() => handleSelectDir(entry)}
              onDoubleClick={() => handleNavigate(entry.path)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                selectedPath === entry.path
                  ? 'bg-[#E8F2FF] text-[#007AFF]'
                  : 'text-text-secondary hover:bg-bg-warm hover:text-text'
              }`}
            >
              <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="truncate">{entry.name}</span>
            </button>
          ))}
          {entries.length === 0 && !loading && (
            <div className="text-center py-8 text-xs text-text-tertiary">空目录</div>
          )}
        </div>

        {/* Selected info + name input */}
        <div className="px-4 py-3 border-t border-border space-y-2 shrink-0">
          {selectedPath && (
            <div className="flex items-center gap-2 text-xs">
              <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-text-tertiary truncate" title={selectedPath}>{selectedPath}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-text-secondary mb-1">工程名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="自动取文件夹名，可修改"
              className="w-full px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 border border-border rounded-md text-sm text-text hover:bg-bg-warm transition-colors cursor-pointer"
            disabled={isCreating}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim() || !selectedPath || isCreating}
            className="px-4 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />创建中...</>
            ) : (
              <><Check className="w-4 h-4" />创建</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
