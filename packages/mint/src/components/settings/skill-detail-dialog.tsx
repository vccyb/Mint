'use client';

import { Loader2, ExternalLink, X } from 'lucide-react';

interface SkillDetailDialogProps {
  skill: { name: string; level: string };
  content: string;
  loading: boolean;
  onClose: () => void;
  onOpenInEditor: (name: string) => void;
}

export function SkillDetailDialog({
  skill,
  content,
  loading,
  onClose,
  onOpenInEditor,
}: SkillDetailDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg mx-4 rounded-lg border border-border bg-bg shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-text">{skill.name}</h3>
            <span className="text-[10px] text-text-tertiary">
              {skill.level === 'builtin' ? 'Built-in skill' : 'User skill'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInEditor(skill.name)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-warm hover:text-text transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
              Open in editor
            </button>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 spinner text-text-tertiary" />
            </div>
          ) : (
            <pre className="text-[11px] leading-5 font-mono text-text whitespace-pre-wrap break-all bg-bg-warm rounded p-3">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmDialogProps {
  skillName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  skillName,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm mx-4 rounded-lg border border-border bg-bg shadow-xl p-4">
        <h3 className="text-sm font-semibold text-text mb-2">Confirm deletion</h3>
        <p className="text-xs text-text-secondary mb-4">
          Are you sure you want to delete skill &ldquo;{skillName}&rdquo;? This action cannot be
          undone.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-warm transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-error px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
