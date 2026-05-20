
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Wrench, Loader2, AlertCircle, Settings2, Sparkles, Plug } from 'lucide-react';
import { ProviderTab } from './settings/provider-tab';
import { SkillsTab } from './settings/skills-tab';
import { McpTab } from './settings/mcp-tab';

interface ToolInfo {
  name: string;
  category: 'native' | 'sdk' | 'mcp';
  description: string;
}

interface SettingsViewProps {
  onBack: () => void;
}

const TABS = [
  { id: 'provider', label: 'Provider', icon: Settings2 },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'skills', label: 'Skills', icon: Sparkles },
  { id: 'mcp', label: 'MCP', icon: Plug },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function SettingsView({ onBack }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('provider');
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    const api = (window as any).electronAPI;
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTools();
      setTools(data.tools ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'tools') {
      fetchTools();
    }
  }, [activeTab, fetchTools]);

  const nativeTools = tools.filter((t) => t.category === 'native');
  const sdkTools = tools.filter((t) => t.category === 'sdk');
  const mcpTools = tools.filter((t) => t.category === 'mcp');

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-6 py-2">
        <button
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded text-text-tertiary hover:bg-bg-warm hover:text-text transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-text">Settings</span>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Left menu */}
        <div className="w-48 border-r border-border p-4">
          <nav className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary/6 text-primary font-semibold'
                      : 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto max-w-2xl">
          {activeTab === 'provider' && <ProviderTab />}

          {activeTab === 'tools' && (
            <div>
              <h2 className="text-sm font-semibold text-text">Available Tools</h2>
              <p className="text-xs text-text-tertiary mt-0.5 mb-4">Tools available to the agent</p>

              {loading && (
                <div className="flex items-center gap-2 text-text-tertiary py-8 justify-center">
                  <Loader2 className="h-4 w-4 spinner" />
                  <span className="text-sm">Loading tools...</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-error py-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!loading && !error && (
                <div className="space-y-6">
                  {nativeTools.length > 0 && (
                    <ToolGroup
                      title="Model-Native"
                      tools={nativeTools}
                      badgeClass="text-success bg-success/10"
                    />
                  )}
                  {sdkTools.length > 0 && (
                    <ToolGroup
                      title="SDK Built-in Tools"
                      tools={sdkTools}
                      badgeClass="text-primary bg-primary/10"
                    />
                  )}
                  {mcpTools.length > 0 && (
                    <ToolGroup
                      title="MCP Tools"
                      tools={mcpTools}
                      badgeClass="text-warning bg-warning/10"
                    />
                  )}
                  {mcpTools.length === 0 && (
                    <p className="text-xs text-text-tertiary italic">
                      No MCP tools connected. Configure MCP servers to add tools.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && <SkillsTab />}

          {activeTab === 'mcp' && <McpTab />}
        </div>
      </div>
    </div>
  );
}

function ToolGroup({
  title,
  tools,
  badgeClass,
}: {
  title: string;
  tools: ToolInfo[];
  badgeClass: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{title}</h3>
      <div className="space-y-2">
        {tools.map((tool) => (
          <div key={tool.name} className="rounded-lg border border-border bg-bg px-3 py-2.5 hover:border-border-hover transition-colors">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-mono font-semibold text-text">{tool.name}</span>
              <span className={`pill text-[10px] font-semibold ${badgeClass}`}>
                {tool.category === 'native' ? 'NATIVE' : tool.category === 'sdk' ? 'SDK' : 'MCP'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">{tool.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
