'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Search, ChevronDown, ChevronRight, Filter, X, Copy, Check } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  scope: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { type: string; message: string; stack?: string };
  traceId?: string;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byScope: Record<string, number>;
  sessions: Array<{ sessionId: string; count: number }>;
}

interface LogsViewProps {
  onBack: () => void;
}

const LEVEL_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  debug: { bg: 'bg-[#F5F5F7]', text: 'text-[#6E6E73]', dot: 'bg-[#AEAEB2]' },
  info: { bg: 'bg-[#E8F2FF]/60', text: 'text-[#007AFF]', dot: 'bg-[#007AFF]' },
  warn: { bg: 'bg-[#FFF8E1]/60', text: 'text-[#FF9500]', dot: 'bg-[#FF9500]' },
  error: { bg: 'bg-[#FFE5E5]/60', text: 'text-[#FF3B30]', dot: 'bg-[#FF3B30]' },
};

export function LogsView({ onBack }: LogsViewProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [sessionIdFilter, setSessionIdFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (levelFilter) params.set('level', levelFilter);
      if (scopeFilter) params.set('scope', scopeFilter);
      if (sessionIdFilter) params.set('sessionId', sessionIdFilter);
      if (searchQuery) params.set('limit', '200');
      else params.set('limit', '100');

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/logs?${params}`),
        fetch('/api/logs?path=stats'),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.entries ?? []);
        setTotal(data.total ?? 0);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
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
    ? logs.filter((l) =>
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
    const text = filteredLogs.map(l =>
      `${l.timestamp} [${l.level.toUpperCase()}] ${l.scope} ${l.message}${l.data ? ' ' + JSON.stringify(l.data) : ''}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/80 bg-white/55 backdrop-blur shrink-0">
        <button onClick={onBack} className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] transition-colors cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="pill bg-[#E8F2FF] text-[#007AFF]">Logs</div>
          <span className="text-xs text-[#AEAEB2]">
            {total} entries
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={copyLogs}
          className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EDEDF0]"
        >
          {copied ? <Check className="h-3 w-3 text-[#34C759]" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={() => { setAutoRefresh(!autoRefresh); fetchLogs(); }}
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
            autoRefresh ? 'bg-[#E8F2FF] text-[#007AFF]' : 'bg-[#F5F5F7] text-[#6E6E73]'
          }`}
        >
          <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
          Live
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-3 px-6 py-2 bg-[#FAFAFA] border-b border-border/40 text-[10px] shrink-0">
          <span className="text-[#AEAEB2]">Levels:</span>
          {Object.entries(stats.byLevel).filter(([, v]) => v > 0).map(([level, count]) => {
            const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.info;
            return (
              <button
                key={level}
                onClick={() => setLevelFilter(levelFilter === level ? '' : level)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  levelFilter === level ? cfg.bg + ' ring-1 ring-current ' + cfg.text : 'hover:bg-[#F0F0F0] text-[#6E6E73]'
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
              <span className="text-[#AEAEB2]">Sessions:</span>
              <span className="text-[#6E6E73] font-mono">{stats.sessions.length}</span>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-border/40 bg-white/80 shrink-0">
        <div className="relative flex-1 max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#AEAEB2]" />
          <input
            type="text"
            placeholder="Search messages, scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] placeholder:text-[#AEAEB2] focus:outline-none focus:ring-1 focus:ring-[#007AFF]/30"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#AEAEB2]" />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="pl-7 pr-6 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] text-[#6E6E73] appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#007AFF]/30"
          >
            <option value="">All scopes</option>
            <option value="api">API</option>
            <option value="lib">Library</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#AEAEB2] pointer-events-none" />
        </div>
        {stats && stats.sessions.length > 0 && (
          <div className="relative">
            <select
              value={sessionIdFilter}
              onChange={(e) => setSessionIdFilter(e.target.value)}
              className="px-3 py-1.5 text-[11px] rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F9FAFB] text-[#6E6E73] appearance-none cursor-pointer max-w-[200px] focus:outline-none focus:ring-1 focus:ring-[#007AFF]/30"
            >
              <option value="">All sessions</option>
              {stats.sessions.slice(0, 10).map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId.slice(0, 12)}... ({s.count})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#AEAEB2] pointer-events-none" />
          </div>
        )}
        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] text-[#FF3B30] hover:text-[#CC2D26] cursor-pointer transition-colors">
            <X className="h-3 w-3" />Clear
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[10px] text-[#AEAEB2]">
          Showing {filteredLogs.length} of {total}
        </span>
      </div>

      {/* Log entries */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[#AEAEB2] text-xs">
            Loading logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#AEAEB2] text-xs">
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

function LogRow({ entry, expanded, onToggle }: { entry: LogEntry; expanded: boolean; onToggle: () => void }) {
  const cfg = LEVEL_CONFIG[entry.level] ?? LEVEL_CONFIG.info;
  const time = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
  const hasDetails = (entry.data && Object.keys(entry.data).length > 0) || entry.error;

  return (
    <div className={`group ${expanded ? cfg.bg : 'hover:bg-[#FAFAFA]'} transition-colors`}>
      <button
        onClick={hasDetails ? onToggle : undefined}
        className={`flex items-center w-full px-6 py-2 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Expand chevron */}
        <span className="w-4 shrink-0">
          {hasDetails ? (
            expanded ? <ChevronDown className="h-3 w-3 text-[#AEAEB2]" /> : <ChevronRight className="h-3 w-3 text-[#AEAEB2]" />
          ) : null}
        </span>

        {/* Level dot */}
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />

        {/* Time */}
        <span className="text-[10px] font-mono text-[#AEAEB2] w-[72px] shrink-0 ml-2">{time}</span>

        {/* Level badge */}
        <span className={`text-[9px] font-semibold uppercase w-[36px] shrink-0 ${cfg.text}`}>
          {entry.level}
        </span>

        {/* Scope */}
        <span className="text-[10px] font-mono text-[#007AFF] w-[140px] shrink-0 truncate">{entry.scope}</span>

        {/* Message */}
        <span className="text-[11px] text-[#1D1D1F] truncate flex-1 min-w-0">{entry.message}</span>

        {/* Error indicator */}
        {entry.error && (
          <span className="text-[9px] text-[#FF3B30] bg-[#FFE5E5] px-1.5 py-0.5 rounded ml-2 shrink-0">
            {entry.error.type}
          </span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 pb-3 pl-[104px]">
          {entry.error && (
            <div className="mb-2 rounded-lg border border-[#FF3B30]/20 bg-[#FFE5E5]/30 px-3 py-2">
              <div className="text-[11px] font-semibold text-[#FF3B30]">{entry.error.type}: {entry.error.message}</div>
              {entry.error.stack && (
                <pre className="mt-1 text-[9px] text-[#6E6E73] whitespace-pre-wrap font-mono leading-relaxed max-h-[120px] overflow-y-auto">
                  {entry.error.stack}
                </pre>
              )}
            </div>
          )}
          {entry.data && Object.keys(entry.data).length > 0 && (
            <div className="rounded-lg border border-border/60 bg-[#F9FAFB] px-3 py-2">
              <pre className="text-[10px] text-[#6E6E73] whitespace-pre-wrap font-mono leading-relaxed max-h-[200px] overflow-y-auto">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
