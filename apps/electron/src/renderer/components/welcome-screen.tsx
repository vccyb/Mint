import { useState, useEffect, useCallback } from 'react';
import { Sparkles, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface DepStatus {
  installed: boolean;
  version?: string;
}

interface WelcomeScreenProps {
  onContinue: () => void;
}

const INSTALL_GUIDE: Record<string, { label: string; hint: string; commands: string[] }> = {
  node: {
    label: 'Node.js',
    hint: '运行 Agent 模式所需',
    commands: ['brew install node', '或访问 https://nodejs.org 下载安装'],
  },
  git: {
    label: 'Git',
    hint: '版本控制与代码管理',
    commands: ['brew install git', '或访问 https://git-scm.com 下载安装'],
  },
};

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [deps, setDeps] = useState<Record<string, DepStatus> | null>(null);
  const [checking, setChecking] = useState(true);

  const checkDeps = useCallback(async () => {
    setChecking(true);
    try {
      const api = (window as any).electronAPI;
      const result = await api.checkSystemDeps();
      setDeps(result);
    } catch {
      setDeps({});
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkDeps();
  }, [checkDeps]);

  const allInstalled = deps && Object.values(deps).every((d) => d.installed);

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
            AI Chat + Autonomous Coding Agent
          </p>
        </div>

        {/* Dep checks */}
        <div className="space-y-3 mb-6">
          {['node', 'git'].map((cmd) => {
            const guide = INSTALL_GUIDE[cmd];
            const status = deps?.[cmd];
            return (
              <div
                key={cmd}
                className="rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-text">{guide.label}</span>
                    <span className="ml-2 text-[10px] text-text-tertiary">{guide.hint}</span>
                  </div>
                  {checking ? (
                    <Loader2 className="h-4 w-4 text-text-tertiary spinner" />
                  ) : status?.installed ? (
                    <div className="flex items-center gap-1.5 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-[11px] font-mono">{status.version}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-[11px]">未安装</span>
                    </div>
                  )}
                </div>
                {status && !status.installed && (
                  <div className="mt-2 space-y-1">
                    {guide.commands.map((c, i) => (
                      <div key={i} className="rounded bg-bg-warm px-2.5 py-1.5 font-mono text-[11px] text-text-secondary">
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={checkDeps}
            disabled={checking}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'spinner' : ''}`} />
            重新检测
          </button>
          <button
            onClick={onContinue}
            disabled={!allInstalled}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            开始使用
          </button>
        </div>

        {!allInstalled && deps && (
          <p className="mt-4 text-center text-[10px] text-text-tertiary">
            请先安装缺少的依赖，然后点击"重新检测"
          </p>
        )}
      </div>
    </div>
  );
}
