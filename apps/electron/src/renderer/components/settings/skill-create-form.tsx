
import { useState } from 'react';
import { Loader2, Plus, ChevronUp } from 'lucide-react';

interface SkillCreateFormProps {
  onSubmit: (name: string, description: string, instructions: string) => Promise<void>;
  onCancel: () => void;
}

export function SkillCreateForm({ onSubmit, onCancel }: SkillCreateFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !instructions.trim()) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), description.trim(), instructions.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded border border-border bg-bg p-3 mb-3 space-y-2.5">
      <div>
        <label className="text-[11px] font-medium text-text-secondary block mb-1">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-skill (kebab-case)"
          className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text font-mono placeholder:text-text-tertiary focus:outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-text-secondary block mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="When to use this skill..."
          className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-text-secondary block mb-1">
          Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Step-by-step instructions for the agent..."
          rows={6}
          className="w-full rounded border border-border bg-bg-warm px-2.5 py-1.5 text-xs text-text font-mono placeholder:text-text-tertiary focus:outline-none focus:border-primary resize-y"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !instructions.trim()}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 spinner" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Create
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-text-tertiary hover:text-text transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
