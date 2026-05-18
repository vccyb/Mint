'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_MODEL } from '@/lib/constants';

interface ProviderConfig {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  permissionMode?: 'bypassPermissions' | 'default' | 'plan';
  systemPrompt?: string;
}

export function ProviderTab() {
  const [config, setConfig] = useState<ProviderConfig>({ model: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    if (type === 'success') toast.success(text);
    else toast.error(text);
  };

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      setConfig({
        model: data.model ?? DEFAULT_MODEL,
        apiKey: data.apiKey ?? '',
        baseUrl: data.baseUrl ?? '',
        permissionMode: data.permissionMode ?? 'bypassPermissions',
        systemPrompt: data.systemPrompt ?? '',
      });
    } catch {
      setMessage({ type: 'error', text: 'Failed to load config' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model || DEFAULT_MODEL,
          apiKey: config.apiKey || undefined,
          baseUrl: config.baseUrl || undefined,
          permissionMode: config.permissionMode || 'bypassPermissions',
          systemPrompt: config.systemPrompt || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      toast.success('设置已保存');
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-4 w-4 spinner" />
        <span className="text-sm">Loading config...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-text">API Provider</h2>
      <p className="text-xs text-text-tertiary mt-0.5 mb-4">
        Configure an Anthropic-compatible API provider
      </p>

      {/* Info box */}
      <div className="rounded border border-border bg-bg-warm px-3 py-2.5 mb-4 max-w-lg">
        <p className="text-xs text-text-secondary leading-relaxed">
          Mint uses the{' '}
          <span className="font-mono font-medium text-text">Anthropic Messages API</span> format.
          Any provider with an Anthropic-compatible endpoint can be used here (e.g. Zhipu GLM,
          OpenRouter, or direct Anthropic API).
        </p>
        <p className="text-[10px] text-text-tertiary mt-1.5">
          Configured values take priority over environment variables (ANTHROPIC_API_KEY,
          ANTHROPIC_BASE_URL).
        </p>
      </div>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-medium text-text mb-1">Model</label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
            placeholder="glm-5.1"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            Model identifier used by the provider (e.g. glm-5.1, claude-sonnet-4-20250514)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text mb-1">API Key</label>
          <input
            type="password"
            value={config.apiKey ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
            placeholder="Enter your API key"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            Your provider&apos;s API key. Overrides ANTHROPIC_API_KEY env var.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text mb-1">Base URL</label>
          <input
            type="text"
            value={config.baseUrl ?? ''}
            onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
            placeholder="https://open.bigmodel.cn/api/anthropic"
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            Anthropic-compatible API endpoint. Overrides ANTHROPIC_BASE_URL env var.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text mb-1">Permission Mode</label>
          <select
            value={config.permissionMode ?? 'bypassPermissions'}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                permissionMode: e.target.value as ProviderConfig['permissionMode'],
              }))
            }
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="bypassPermissions">Bypass (auto-approve all)</option>
            <option value="default">Default (ask for dangerous tools)</option>
            <option value="plan">Plan mode (read-only, no edits)</option>
          </select>
          <p className="text-[10px] text-text-tertiary mt-1">
            Controls how the agent requests permission to use tools. &quot;Bypass&quot;
            auto-approves everything.
          </p>
        </div>

        <details className="group">
          <summary className="text-xs font-medium text-text-secondary cursor-pointer hover:text-text transition-colors">
            System Prompt（高级）
          </summary>
          <div className="mt-2">
            <textarea
              value={config.systemPrompt ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
              placeholder="自定义系统提示词，会注入到每次 Agent 对话的开头..."
              rows={4}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-y font-mono text-xs leading-relaxed"
            />
            <p className="text-[10px] text-text-tertiary mt-1">
              留空则使用默认系统提示词。适合设置角色、约束条件、输出格式等。
            </p>
          </div>
        </details>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 spinner" />}
          Save
        </button>

        {message && (
          <div
            className={`flex items-center gap-2 text-sm ${
              message.type === 'success' ? 'text-success' : 'text-error'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
