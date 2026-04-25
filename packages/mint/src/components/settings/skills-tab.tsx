'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Trash2,
  Plus,
  ChevronUp,
  Eye,
  ExternalLink,
  X,
  Zap,
  User,
} from 'lucide-react';

interface SkillMeta {
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  level: 'builtin' | 'user';
}

export function SkillsTab() {
  const [skills, setSkills] = useState<SkillMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillsEnabled, setSkillsEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Detail dialog state
  const [detailSkill, setDetailSkill] = useState<{
    name: string;
    level: string;
  } | null>(null);
  const [detailContent, setDetailContent] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skills');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSkills(data.skills ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const data = await res.json();
      setSkillsEnabled(data.skillsEnabled ?? false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSkills();
    fetchConfig();
  }, [fetchSkills, fetchConfig]);

  const handleToggleEnabled = async () => {
    setConfigLoading(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillsEnabled: !skillsEnabled }),
      });
      setSkillsEnabled(!skillsEnabled);
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  };

  const handleToggleSkill = async (name: string) => {
    try {
      const res = await fetch('/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setSkills((prev) =>
        prev.map((s) => (s.name === name ? { ...s, enabled: data.enabled } : s)),
      );
    } catch {
      // ignore
    }
  };

  const handleDeleteSkill = async (name: string) => {
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return;
      setSkills((prev) => prev.filter((s) => s.name !== name));
      setDeleteTarget(null);
    } catch {
      // ignore
    }
  };

  const handleCreateSkill = async () => {
    if (!newName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/skills/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          content: newInstructions.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setNewName('');
      setNewDescription('');
      setNewInstructions('');
      setShowCreateForm(false);
      await fetchSkills();
    } catch {
      // ignore
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewDetail = async (name: string, level: string) => {
    setDetailSkill({ name, level });
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(name)}/content`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setDetailContent(data.content ?? '');
    } catch {
      setDetailContent('Failed to load skill content.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenInEditor = async (name: string) => {
    try {
      await fetch(`/api/skills/${encodeURIComponent(name)}/open`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }
  };

  const builtins = skills.filter((s) => s.level === 'builtin');
  const userSkills = skills.filter((s) => s.level === 'user');

  return (
    <div>
      <h2 className="text-sm font-semibold text-text">Skills</h2>
      <p className="text-xs text-text-tertiary mt-0.5 mb-4">
        Manage agent skills and capabilities
      </p>

      {/* Global toggle */}
      <div className="flex items-center justify-between rounded border border-border bg-bg px-3 py-2.5 mb-4 max-w-md">
        <div>
          <span className="text-sm font-medium text-text">Enable Skills</span>
          <p className="text-[10px] text-text-tertiary">Allow the agent to use skill plugins</p>
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={configLoading}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            skillsEnabled ? 'bg-primary' : 'bg-border'
          }`}
          role="switch"
          aria-checked={skillsEnabled}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              skillsEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
          <Loader2 className="h-4 w-4 spinner" />
          <span className="text-sm">Loading skills...</span>
        </div>
      ) : (
        <div className="space-y-5 max-w-md">
          <Section title="Built-in" icon={Zap}>
            {builtins.length === 0 ? (
              <p className="text-xs text-text-tertiary italic">No built-in skills.</p>
            ) : (
              builtins.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onToggle={() => handleToggleSkill(skill.name)}
                  onView={() => handleViewDetail(skill.name, skill.level)}
                  onDelete={undefined}
                />
              ))
            )}
          </Section>

          <Section title="My Skills" icon={User}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer mb-2"
            >
              {showCreateForm ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create Skill
            </button>

            {showCreateForm && (
              <div className="rounded border border-border bg-bg p-3 mb-3 space-y-2.5">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="my-skill (kebab-case)"
                    className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text font-mono placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Description</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="When to use this skill..."
                    className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Instructions</label>
                  <textarea
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    placeholder="Step-by-step instructions for the agent..."
                    rows={6}
                    className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text font-mono placeholder:text-text-tertiary focus:outline-none focus:border-primary resize-y"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCreateSkill}
                    disabled={createLoading || !newName.trim() || !newInstructions.trim()}
                    className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {createLoading ? <Loader2 className="h-3 w-3 spinner" /> : <Plus className="h-3 w-3" />}
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-xs text-text-tertiary hover:text-text transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {userSkills.length === 0 && !showCreateForm ? (
              <p className="text-xs text-text-tertiary italic">No custom skills yet.</p>
            ) : (
              userSkills.map((skill) => (
                <SkillCard
                  key={skill.name}
                  skill={skill}
                  onToggle={() => handleToggleSkill(skill.name)}
                  onView={() => handleViewDetail(skill.name, skill.level)}
                  onDelete={() => setDeleteTarget(skill.name)}
                />
              ))
            )}
          </Section>
        </div>
      )}

      {/* Detail dialog */}
      {detailSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 rounded-lg border border-border bg-bg shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-text">{detailSkill.name}</h3>
                <span className="text-[10px] text-text-tertiary">
                  {detailSkill.level === 'builtin' ? 'Built-in skill' : 'User skill'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenInEditor(detailSkill.name)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-warm hover:text-text transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in editor
                </button>
                <button
                  onClick={() => {
                    setDetailSkill(null);
                    setDetailContent('');
                  }}
                  className="text-text-tertiary hover:text-text transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 spinner text-text-tertiary" />
                </div>
              ) : (
                <pre className="text-[11px] leading-5 font-mono text-text whitespace-pre-wrap break-all bg-bg-warm rounded p-3">
                  {detailContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 rounded-lg border border-border bg-bg shadow-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-2">Confirm deletion</h3>
            <p className="text-xs text-text-secondary mb-4">
              Are you sure you want to delete skill &ldquo;{deleteTarget}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-warm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSkill(deleteTarget)}
                className="rounded bg-error px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Section ─────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-text-tertiary" />
        <span className="text-xs font-semibold text-text">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ── Skill card ──────────────────────────────────────── */

function SkillCard({
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
