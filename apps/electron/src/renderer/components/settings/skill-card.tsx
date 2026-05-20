
import { Trash2, Eye } from 'lucide-react';

export interface SkillMeta {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  level: 'builtin' | 'user';
}

export function SkillCard({
  skill,
  onToggle,
  onView,
  onDelete,
}: {
  skill: SkillMeta;
  onToggle: () => void;
  onView: () => void;
  onDelete?: () => void;
}) {
  const isBuiltin = skill.level === 'builtin';

  return (
    <div className="rounded border border-border bg-bg">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-text">{skill.name}</span>
            <span className="pill text-[10px] font-semibold text-text-tertiary bg-bg-warm">
              v{skill.version}
            </span>
            {isBuiltin && (
              <span className="pill text-[10px] font-semibold text-primary-text bg-primary-light">
                built-in
              </span>
            )}
          </div>
          {skill.description && (
            <p className="text-xs text-text-secondary truncate mt-0.5">{skill.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onView}
            className="text-text-tertiary hover:text-text transition-colors cursor-pointer"
            aria-label={`View ${skill.name}`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-text-tertiary hover:text-error transition-colors cursor-pointer"
              aria-label={`Delete ${skill.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              skill.enabled ? 'bg-primary' : 'bg-border'
            }`}
            role="switch"
            aria-checked={skill.enabled}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                skill.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
