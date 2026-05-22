
import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { McpServerConfig } from '@/types/mcp';
import { McpServerCard } from './mcp-server-card';

export function McpTab() {
  const [configs, setConfigs] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, import('@/types/mcp').McpConnectionTestResult>>({});
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addCommand, setAddCommand] = useState('');
  const [addArgs, setAddArgs] = useState('');
  const [addEnv, setAddEnv] = useState('');

  const fetchConfigs = useCallback(async () => {
    const api = (window as any).electronAPI;
    setLoading(true);
    try {
      const data = await api.readMcpConfig();
      setConfigs(Array.isArray(data) ? data : (data.configs ?? []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleTest = useCallback(async (config: McpServerConfig) => {
    const api = (window as any).electronAPI;
    setTesting((prev) => ({ ...prev, [config.id]: true }));
    try {
      const result = await api.mcpTest({
        command: config.command,
        args: config.args,
        env: config.env,
      });
      setTestResults((prev) => ({ ...prev, [config.id]: result }));
      setExpandedServer(config.id);
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { status: 'error', tools: [], error: 'Network error', latencyMs: 0 },
      }));
    } finally {
      setTesting((prev) => ({ ...prev, [config.id]: false }));
    }
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    const api = (window as any).electronAPI;
    try {
      await api.updateMcpConfig({ id });
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const api = (window as any).electronAPI;
    setDeleting(id);
    try {
      await api.updateMcpConfig({ deleteId: id });
      setConfigs((prev) => prev.filter((c) => c.id !== id));
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }, []);

  const handleAdd = useCallback(async () => {
    if (!addName.trim() || !addCommand.trim()) return;

    const env: Record<string, string> = {};
    if (addEnv.trim()) {
      for (const line of addEnv.trim().split('\n')) {
        const eq = line.indexOf('=');
        if (eq > 0) {
          env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        }
      }
    }

    try {
      const api = (window as any).electronAPI;
      const data = await api.updateMcpConfig({
        name: addName.trim(),
        command: addCommand.trim(),
        args: addArgs.trim() ? addArgs.trim().split(/\s+/) : [],
        env: Object.keys(env).length > 0 ? env : undefined,
      });
      if (data.config) {
        setConfigs((prev) => [...prev, data.config]);
      }
      setShowAdd(false);
      setAddName('');
      setAddCommand('');
      setAddArgs('');
      setAddEnv('');
    } catch {
      // ignore
    }
  }, [addName, addCommand, addArgs, addEnv]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text">MCP Servers</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            配置 Model Context Protocol 服务器，接入外部工具和数据源
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3 w-3" />
          添加 Server
        </button>
      </div>

      {/* Tips */}
      <div className="rounded border border-border bg-bg-warm px-3 py-2.5 mb-4">
        <p className="text-xs text-text-secondary leading-relaxed">
          MCP（Model Context Protocol）允许 Agent 连接外部工具服务。每个 Server 是一个独立进程，
          通过 stdio 与 Agent 通信。点击 <strong>Test</strong> 可验证 Server 是否正常运行。
          配置完成后，Server 提供的工具会出现在 Tools 标签页中。
        </p>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-bg-warm p-3 mb-4 space-y-2.5">
          <input
            type="text"
            placeholder="Server 名称（如 my-mcp-server）"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="启动命令（如 npx、python、node）"
            value={addCommand}
            onChange={(e) => setAddCommand(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="命令参数（空格分隔，如 -y @anthropic/mcp-server）"
            value={addArgs}
            onChange={(e) => setAddArgs(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="环境变量（每行一个，格式 KEY=VALUE）"
            value={addEnv}
            onChange={(e) => setAddEnv(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none resize-none font-mono"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!addName.trim() || !addCommand.trim()}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                addName.trim() && addCommand.trim()
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'bg-bg-warm text-text-tertiary cursor-not-allowed',
              )}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Server list */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Loading servers...</span>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-8">
          <Plug className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
          <p className="text-sm text-text-secondary">No MCP servers configured</p>
          <p className="text-xs text-text-tertiary mt-1">Add a server to connect external tools</p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <McpServerCard
              key={config.id}
              config={config}
              testResult={testResults[config.id]}
              isTesting={!!testing[config.id]}
              isExpanded={expandedServer === config.id}
              deleting={deleting}
              onToggle={handleToggle}
              onTest={handleTest}
              onDelete={handleDelete}
              onToggleExpand={(id) => setExpandedServer(expandedServer === id ? null : id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
