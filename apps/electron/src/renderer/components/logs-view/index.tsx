
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ChevronDown,
  Filter,
  X,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { LogRow, LEVEL_CONFIG } from './log-row';
import type { LogEntry } from './log-row';

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byScope: Record<string, number>;
  sessions: Array<{ sessionId: string; count: number }>;
}

interface LogsViewProps {
  onBack: () => void;
  initialSessionId?: string | null;
  sessionTitle?: string;
}

export function LogsView({ onBack, initialSessionId, sessionTitle }: LogsViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [sessionIdFilter, setSessionIdFilter] = useState(initialSessionId ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchLogs = useCallback(async () => {
    const api = (window as any).electronAPI;
    try {
      // readLogs returns all logs; we filter client-side
      const data = await api.readLogs();
      let entries = data.entries ?? data ?? [];
      // Client-side filtering
      if (levelFilter) {
        entries = entries.filter((e: LogEntry) => e.level === levelFilter);
      }
      if (scopeFilter) {
        entries = entries.filter((e: LogEntry) => e.scope === scopeFilter);
      }
      if (sessionIdFilter) {
        entries = entries.filter((e: LogEntry) => e.sessionId === sessionIdFilter);
      }
      const limit = searchQuery ? 200 : 100;
      entries = entries.slice(0, limit);
      setLogs(entries);
      setTotal(data.total ?? entries.length);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [levelFilter, scopeFilter, sessionIdFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 3s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 3000);
      return () => clearInterval(intervalRef.current);
    }
  }, [autoRefresh, fetchLogs]);

  const filteredLogs = searchQuery
    ? logs.filter(
        (l) =>
          l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.scope.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : logs;

  const clearFilters = () => {
    setLevelFilter('');
    setScopeFilter('');
    setSessionIdFilter('');
    setSearchQuery('');
  };

  const hasFilters = levelFilter || scopeFilter || sessionIdFilter || searchQuery;

  const copyLogs = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `${l.timestamp} [${l.level.toUpperCase()}] ${l.scope} ${l.message}${l.data ? ' ' + JSON.stringify(l.data) : ''}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportLogs = () => {
    // TODO: Log export needs a dedicated IPC handler for Electron
    const params = new URLSearchParams();
    params.set('format', 'export');
    if (levelFilter) params.set('level', levelFilter);
    if (scopeFilter) params.set('scope', scopeFilter);
    if (sessionIdFilter) params.set('sessionId', sessionIdFilter);
    window.open(`/api/logs?${params}`, '_blank');
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/80 bg-card/55 backdrop-blur shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-bg-warm text-muted-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="pill bg-primary-light text-primary">Logs</div>
          {initialSessionId && sessionTitle ? (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{sessionTitle}</span>
          ) : null}
          <span className="text-xs text-text-tertiary">{total} entries</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={copyLogs}
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer bg-bg-warm text-muted-foreground hover:bg-bg-hover"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={exportLogs}
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer bg-bg-warm text-muted-foreground hover:bg-bg-hover"
        >
          <Download className="h-3 w-3" />
          Export
        </button>
        <button
          onClick={() => {
            setAutoRefresh(!autoRefresh);
            fetchLogs();
          }}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
            autoRefresh ? 'bg-primary-light text-primary' : 'bg-bg-warm text-muted-foreground'
          }`}
        >
          <RefreshCw
            className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`}
            style={{ animationDuration: '3s' }}
          />
          Live
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-3 px-6 py-2 bg-[#FAFAFA] border-b border-border/40 text-[10px] shrink-0">
          <span className="text-text-tertiary">Levels:</span>
          {Object.entries(stats.byLevel)
            .filter(([, v]) => v > 0)
            .map(([level, count]) => {
              const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;
              return (
                <button
                  key={level}
                  onClick={() => setLevelFilter(levelFilter === level ? '' : level)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    levelFilter === level
                      ? cfg.bg + ' ring-1 ring-current ' + cfg.text
                      : 'hover:bg-[#F0F0F0] text-muted-foreground'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {level} <span className="font-mono">{count}</span>
                </button>
              );
            })}
          {stats.sessions.length > 0 && (
            <>
              <span className="text-[#D1D1D6] mx-1">|</span>
              <span className="text-text-tertiary">Sessions:</span>
              <span className="text-muted-foreground font-mono">{stats.sessions.length}</span>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-border/40 bg-card/80 shrink-0">
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search messages, scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary" />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="pl-7 pr-6 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] text-muted-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="">All scopes</option>
            <option value="api">API</option>
            <option value="lib">Library</option>
            <option value="storage">Storage</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
        </div>
        {stats && stats.sessions.length > 0 && (
          <div className="relative">
            <select
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
              className="px-3 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] text-muted-foreground appearance-none cursor-pointer max-w-[200px] focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="">All sessions</option>
              {stats.sessions.slice(0, 10).map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId.slice(0, 12)}... ({s.count})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-tertiary pointer-events-none" />
          </div>
        )}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] text-destructive hover:text-[#CC2D26] cursor-pointer transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-text-tertiary">
          Showing {filteredLogs.length} of {total}
        </span>
      </div>

      {/* Log entries */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-xs">
            No logs found
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="divide-y divide-[rgba(0,0,0,0.04)]">
              {filteredLogs.map((entry) => (
                <LogRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
