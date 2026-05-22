
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
  sttApiKey?: string;
  sttResourceId?: string;
}

interface ProviderTabProps {
  onResetConfig?: () => void;
}

export function ProviderTab({ onResetConfig }: ProviderTabProps) {
  const [config, setConfig] = useState<ProviderConfig>({ model: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    if (type === 'success') toast.success(text);
    else toast.error(text);
  };

  const fetchConfig = useCallback(async () => {
    const api = (window as any).electronAPI;
    setLoading(true);
    try {
      const data = await api.readConfig();
      setConfig({
        model: data.model ?? DEFAULT_MODEL,
        apiKey: data.apiKey ?? '',
        baseUrl: data.baseUrl ?? '',
        permissionMode: data.permissionMode ?? 'bypassPermissions',
        systemPrompt: data.systemPrompt ?? '',
        sttApiKey: data.sttApiKey ?? '',
        sttResourceId: data.sttResourceId ?? '',
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
    const api = (window as any).electronAPI;
    setSaving(true);
    setMessage(null);
    try {
      await api.updateConfig({
        model: config.model || DEFAULT_MODEL,
        apiKey: config.apiKey || undefined,
        baseUrl: config.baseUrl || undefined,
        permissionMode: config.permissionMode || 'bypassPermissions',
        systemPrompt: config.systemPrompt || undefined,
        sttApiKey: config.sttApiKey || undefined,
        sttResourceId: config.sttResourceId || undefined,
      });
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
        配置兼容 Anthropic API 的服务提供方
      </p>

      {/* Info box */}
      <div className="rounded border border-border bg-bg-warm px-3 py-2.5 mb-4 max-w-lg">
        <p className="text-xs text-text-secondary leading-relaxed">
          Mint 使用{' '}
          <span className="font-mono font-medium text-text">Anthropic Messages API</span> 格式。
          任何兼容 Anthropic 接口的 Provider 都可以在此使用（如智谱 GLM、OpenRouter、或 Anthropic 官方 API）。
        </p>
        <p className="text-[10px] text-text-tertiary mt-1.5">
          在此设置的值优先级高于环境变量（ANTHROPIC_API_KEY、ANTHROPIC_BASE_URL）。
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
            模型标识符，由 Provider 定义（如 glm-5.1、claude-sonnet-4-20250514）
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
            你的 Provider API 密钥。填写后会覆盖 ANTHROPIC_API_KEY 环境变量。
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
            兼容 Anthropic 的 API 地址。填写后会覆盖 ANTHROPIC_BASE_URL 环境变量。
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
            控制 Agent 使用工具时的权限策略。"Bypass" 自动批准所有操作；"Default" 对危险操作需确认；"Plan" 仅允许读取。
          </p>
        </div>

        <details className="group">
          <summary className="text-xs font-medium text-text-secondary cursor-pointer hover:text-text transition-colors">
            语音识别（STT API Key）
          </summary>
          <div className="mt-2 space-y-3">
            <p className="text-[10px] text-text-tertiary">
              用于语音输入功能。在火山引擎豆包语音平台获取 API Key，填入下方即可启用麦克风语音识别。
            </p>
            <div>
              <label className="block text-xs font-medium text-text mb-1">STT API Key</label>
              <input
                type="password"
                value={config.sttApiKey ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, sttApiKey: e.target.value }))}
                placeholder="豆包语音识别 API Key"
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-text-tertiary mt-1">
                在火山引擎控制台「豆包语音 → 系统管理 → API Key管理」中创建
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-text mb-1">STT Resource ID</label>
              <input
                type="text"
                value={config.sttResourceId ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, sttResourceId: e.target.value }))}
                placeholder="volc.bigasr.sauc.duration"
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <p className="text-[10px] text-text-tertiary mt-1">
                默认 volc.bigasr.sauc.duration，一般无需修改
              </p>
            </div>
          </div>
        </details>

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

        {onResetConfig && (
          <div className="pt-6 mt-6 border-t border-border">
            <p className="text-xs text-text-tertiary mb-2">开发调试：重新进入欢迎引导页</p>
            <button
              onClick={onResetConfig}
              className="rounded border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              显示引导页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
