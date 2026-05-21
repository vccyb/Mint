
import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';

type SandboxMode = 'off' | 'workspace' | 'strict';

const OPTIONS: { value: SandboxMode; label: string; desc: string }[] = [
  {
    value: 'off',
    label: '关闭',
    desc: 'Agent 执行的命令直接在宿主机运行，没有任何隔离。最灵活但也最危险，Agent 可以读写系统任意文件。',
  },
  {
    value: 'workspace',
    label: '工作区（推荐）',
    desc: 'Agent 的写操作被限制在项目目录内，不能修改项目以外的文件。读操作不受限制。bash 命令会自动放行，无需手动审批。',
  },
  {
    value: 'strict',
    label: '严格',
    desc: '在工作区隔离基础上，额外禁止网络访问。Agent 只能读取文件，不能联网。适合运行不信任代码的场景。',
  },
];

export function SandboxTab() {
  const [mode, setMode] = useState<SandboxMode>('workspace');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchConfig = useCallback(async () => {
    const api = (window as any).electronAPI;
    setLoading(true);
    try {
      const data = await api.readConfig();
      setMode(data.sandboxMode ?? 'workspace');
    } catch {
      setMessage({ type: 'error', text: '加载配置失败' });
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
      await api.updateConfig({ sandboxMode: mode });
      setMessage({ type: 'success', text: '沙箱设置已保存' });
      toast.success('沙箱设置已保存');
    } catch {
      setMessage({ type: 'error', text: '保存失败，请重试' });
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-text-tertiary py-8">
        <Loader2 className="h-4 w-4 spinner" />
        <span className="text-sm">加载中...</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-text">沙箱</h2>
      <p className="text-xs text-text-tertiary mt-0.5 mb-4">
        控制 Agent 执行命令时的隔离级别
      </p>

      <div className="space-y-3 max-w-lg">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              mode === opt.value
                ? 'border-primary bg-primary/4'
                : 'border-border hover:border-border-hover hover:bg-bg-hover'
            }`}
          >
            <input
              type="radio"
              name="sandboxMode"
              value={opt.value}
              checked={mode === opt.value}
              onChange={() => setMode(opt.value)}
              className="mt-0.5 accent-primary"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Shield className={`h-3.5 w-3.5 ${mode === opt.value ? 'text-primary' : 'text-text-tertiary'}`} />
                <span className={`text-sm font-medium ${mode === opt.value ? 'text-primary' : 'text-text'}`}>
                  {opt.label}
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 spinner" />}
          保存
        </button>
        {message && (
          <div className={`flex items-center gap-1.5 text-xs ${message.type === 'success' ? 'text-success' : 'text-error'}`}>
            {message.type === 'success' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
