'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, ChevronUp, Zap, User } from 'lucide-react';
import { SkillCard } from './skill-card';
import type { SkillMeta } from './skill-card';
import { SkillCreateForm } from './skill-create-form';
import { SkillDetailDialog, DeleteConfirmDialog } from './skill-detail-dialog';

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
      setSkills((prev) => prev.map((s) => (s.name === name ? { ...s, enabled: data.enabled } : s)));
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

  const handleCreateSkill = async (name: string, description: string, content: string) => {
    const res = await fetch('/api/skills/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, content }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed');
    }
    setShowCreateForm(false);
    await fetchSkills();
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
      <p className="text-xs text-text-tertiary mt-0.5 mb-4">Manage agent skills and capabilities</p>

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
              <SkillCreateForm
                onSubmit={handleCreateSkill}
                onCancel={() => setShowCreateForm(false)}
              />
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

      {detailSkill && (
        <SkillDetailDialog
          skill={detailSkill}
          content={detailContent}
          loading={detailLoading}
          onClose={() => {
            setDetailSkill(null);
            setDetailContent('');
          }}
          onOpenInEditor={handleOpenInEditor}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          skillName={deleteTarget}
          onConfirm={() => handleDeleteSkill(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
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
