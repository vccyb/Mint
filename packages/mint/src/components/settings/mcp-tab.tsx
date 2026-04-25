'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Plug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { McpServerConfig, McpConnectionTestResult } from '@/types/mcp';

export function McpTab() {
  const [configs, setConfigs] = useState<McpServerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, McpConnectionTestResult>>({});
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [addName, setAddName] = useState('');
  const [addCommand, setAddCommand] = useState('');
  const [addArgs, setAddArgs] = useState('');
  const [addEnv, setAddEnv] = useState('');

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp/config');
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs ?? []);
      }
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
    setTesting((prev) => ({ ...prev, [config.id]: true }));
    try {
      const res = await fetch('/api/mcp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: config.command,
          args: config.args,
          env: config.env,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setTestResults((prev) => ({ ...prev, [config.id]: result }));
        setExpandedServer(config.id);
      }
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
    try {
      await fetch('/api/mcp/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setConfigs((prev) =>
        prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
      );
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/mcp/config?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
      const res = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          command: addCommand.trim(),
          args: addArgs.trim() ? addArgs.trim().split(/\s+/) : [],
          env: Object.keys(env).length > 0 ? env : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfigs((prev) => [...prev, data.config]);
        setShowAdd(false);
        setAddName('');
        setAddCommand('');
        setAddArgs('');
        setAddEnv('');
      }
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
            Configure Model Context Protocol servers
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Server
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-bg-warm p-3 mb-4 space-y-2.5">
          <input
            type="text"
            placeholder="Server name (e.g. my-mcp-server)"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Command (e.g. npx, python, node)"
            value={addCommand}
            onChange={(e) => setAddCommand(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Arguments (space-separated, e.g. -y @anthropic/mcp-server)"
            value={addArgs}
            onChange={(e) => setAddArgs(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="Environment variables (one per line, KEY=VALUE)"
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
          <p className="text-xs text-text-tertiary mt-1">
            Add a server to connect external tools
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => {
            const testResult = testResults[config.id];
            const isTesting = testing[config.id];
            const isExpanded = expandedServer === config.id;

            return (
              <div key={config.id} className="rounded-lg border border-border overflow-hidden">
                {/* Server header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-bg">
                  <button
                    onClick={() => setExpandedServer(isExpanded ? null : config.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>

                  {/* Status indicator */}
                  {testResult?.status === 'connected' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : testResult?.status === 'error' ? (
                    <XCircle className="h-3.5 w-3.5 text-error shrink-0" />
                  ) : (
                    <div className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      config.enabled ? 'bg-text-tertiary' : 'bg-border',
                    )} />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text truncate">
                        {config.name}
                      </span>
                      {testResult && testResult.tools.length > 0 && (
                        <span className="pill text-[10px] font-semibold bg-warning/10 text-warning">
                          {testResult.tools.length} tool{testResult.tools.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {!config.enabled && (
                        <span className="pill text-[10px] font-semibold bg-bg-warm text-text-tertiary">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-tertiary font-mono truncate">
                      {config.command} {config.args.join(' ')}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggle(config.id)}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors',
                      config.enabled
                        ? 'bg-success/10 text-success hover:bg-success/15'
                        : 'bg-bg-warm text-text-tertiary hover:bg-bg-hover',
                    )}
                  >
                    {config.enabled ? 'ON' : 'OFF'}
                  </button>

                  <button
                    onClick={() => handleTest(config)}
                    disabled={isTesting}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                  >
                    {isTesting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Zap className="h-3 w-3" />
                    )}
                    Test
                  </button>

                  <button
                    onClick={() => handleDelete(config.id)}
                    disabled={deleting === config.id}
                    className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-error/5 hover:text-error transition-colors disabled:opacity-50"
                  >
                    {deleting === config.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2 bg-bg-warm/50">
                    {testResult?.error && (
                      <p className="text-xs text-error mb-2">{testResult.error}</p>
                    )}
                    {testResult && testResult.tools.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wide">
                          Available Tools
                        </p>
                        {testResult.tools.map((tool) => (
                          <div key={tool.name} className="rounded border border-border bg-bg px-2 py-1.5">
                            <span className="text-xs font-mono font-semibold text-text">
                              {tool.name}
                            </span>
                            {tool.description && (
                              <p className="text-[10px] text-text-secondary mt-0.5">
                                {tool.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : testResult?.status === 'connected' ? (
                      <p className="text-xs text-text-tertiary">No tools exposed by this server.</p>
                    ) : !testResult ? (
                      <p className="text-xs text-text-tertiary">Click &quot;Test&quot; to discover tools.</p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
