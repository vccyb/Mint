import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { DEFAULT_MODEL, DEFAULT_BASE_URL } from '@/lib/constants';

interface WelcomeScreenProps {
  onSave: (config: { model: string; apiKey: string; baseUrl: string }) => Promise<void>;
}

export function WelcomeScreen({ onSave }: WelcomeScreenProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('请输入 API Key');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ model, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || DEFAULT_BASE_URL });
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">欢迎使用 Mint</h1>
          <p className="mt-2 text-sm text-text-secondary">
            配置你的 API 以开始使用
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              API Key <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入你的 API Key"
              autoFocus
              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,122,255,0.08)]"
            />
            <p className="text-[10px] text-text-tertiary mt-1">
              支持 Anthropic 兼容 API（智谱 GLM、OpenRouter 等）
            </p>
          </div>

          <details className="group">
            <summary className="text-xs font-medium text-text-secondary cursor-pointer hover:text-text transition-colors">
              高级设置
            </summary>
            <div className="mt-3 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-text-tertiary mt-1">
                  API 端点地址
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">模型</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={DEFAULT_MODEL}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                />
                <p className="text-[10px] text-text-tertiary mt-1">
                  模型标识（如 glm-5.1、claude-sonnet-4-20250514）
                </p>
              </div>
            </div>
          </details>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !apiKey.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 spinner" />
            ) : (
              '开始使用'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] text-text-tertiary">
          配置存储在本地 ~/.mint/config.json，随时可在设置中修改
        </p>
      </div>
    </div>
  );
}
