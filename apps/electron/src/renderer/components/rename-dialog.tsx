
import { useState, useEffect, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface RenameDialogProps {
  open: boolean;
  title: string;
  initialName: string;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>;
}

export function RenameDialog({ open, title, initialName, onClose, onConfirm }: RenameDialogProps) {
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  const handleConfirm = async () => {
    if (!name.trim() || name === initialName) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(name.trim());
      onClose();
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入名称"
            className="w-full px-3 py-2 border border-border rounded-md bg-bg-warm text-text focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border border-border rounded-md text-text hover:bg-bg-warm transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim() || name === initialName || isSaving}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </>
            ) : (
              '确定'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
