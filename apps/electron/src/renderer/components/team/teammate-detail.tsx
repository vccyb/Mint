import { useState } from 'react';
import type { TeammateState } from '@/types';
import {
  avatarColor,
  formatElapsed,
  STATUS_BG,
  STATUS_COLORS,
  STATUS_LABEL,
} from './teammate-shared';
import { DetailSectionLabel, CommBubble, StatBadge } from './teammate-detail-helpers';

export function TeammateDetail({ teammate: tm, now }: { teammate: TeammateState; now: number }) {
  const color = avatarColor(tm.index);
  const elapsed = formatElapsed(
    tm.startedAt,
    tm.endedAt ?? (tm.status === 'running' ? undefined : now),
  );
  const name = tm.description || `Agent ${tm.index + 1}`;
  const [promptExpanded, setPromptExpanded] = useState(false);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          {tm.index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_BG[tm.status]}`}
              style={{ color: STATUS_COLORS[tm.status] }}
            >
              {STATUS_LABEL[tm.status]}
            </span>
            <span className="text-[10px] text-muted-foreground">{elapsed}</span>
            {tm.taskType && (
              <span className="text-[9px] text-text-tertiary">
                {tm.taskType === 'local_agent'
                  ? '本地 Agent'
                  : tm.taskType === 'remote_agent'
                    ? '远程 Agent'
                    : tm.taskType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task Description */}
      <div className="mb-4">
        <DetailSectionLabel
          icon={
            <svg
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        >
          任务描述
        </DetailSectionLabel>
        <div className="rounded-lg border border-border bg-[#F9FAFB] px-3 py-2.5 text-[11px] text-foreground leading-relaxed">
          {tm.description || '执行子任务'}
        </div>
      </div>

      {/* Initial Prompt (collapsible) */}
      {tm.prompt && (
        <div className="mb-4">
          <button
            onClick={() => setPromptExpanded(!promptExpanded)}
            className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            <svg
              className="h-2.5 w-2.5 transition-transform"
              style={{ transform: promptExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            初始 Prompt
          </button>
          {promptExpanded && (
            <div className="rounded-lg border border-border bg-[#F9FAFB] px-3 py-2.5 text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {tm.prompt}
            </div>
          )}
        </div>
      )}

      {/* Live Progress (running) */}
      {tm.status === 'running' && (
        <div className="mb-4">
          <DetailSectionLabel
            icon={
              <svg
                className="h-2.5 w-2.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
              </svg>
            }
          >
            执行进度
          </DetailSectionLabel>
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] text-foreground">
                {tm.currentToolName ? `正在使用 ${tm.currentToolName}...` : '处理中...'}
              </span>
            </div>
            {tm.progressDescription && (
              <div className="text-[10px] text-muted-foreground mt-1.5 pl-3.5">
                {tm.progressDescription}
              </div>
            )}
            {tm.toolHistory.length > 0 && (
              <div className="mt-2 pt-2 border-t border-primary/10">
                <span className="text-[9px] text-text-tertiary">已使用工具：</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tm.toolHistory.map((tool, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Agent Communication */}
      <div className="mb-4">
        <DetailSectionLabel
          icon={
            <svg
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        >
          Agent 通信
        </DetailSectionLabel>
        <div className="space-y-2">
          <CommBubble
            direction="outgoing"
            label="主 Agent → 子 Agent"
            content={`启动任务：${tm.description || '执行子任务'}`}
            time={tm.startedAt}
          />
          {tm.toolHistory.length > 0 && (
            <CommBubble
              direction="incoming"
              label="子 Agent → 主 Agent"
              content={`工具调用：${tm.toolHistory.join(' → ')}`}
            />
          )}
          {tm.summary && tm.status !== 'running' && (
            <CommBubble
              direction="incoming"
              label="子 Agent → 主 Agent"
              content={tm.summary.slice(0, 300)}
              time={tm.endedAt}
              isResult
            />
          )}
          {tm.status === 'running' && (
            <CommBubble
              direction="incoming"
              label="子 Agent → 主 Agent"
              content="执行中，等待返回结果..."
              isPending
            />
          )}
        </div>
      </div>

      {/* Result */}
      {tm.summary && tm.status !== 'running' && (
        <div className="mb-4">
          <DetailSectionLabel
            icon={
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          >
            执行结果
          </DetailSectionLabel>
          <div className="rounded-lg border border-border bg-card p-3 text-[11px] text-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {tm.summary}
          </div>
        </div>
      )}

      {/* Usage stats */}
      {tm.usage && (
        <div>
          <DetailSectionLabel
            icon={
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
          >
            资源用量
          </DetailSectionLabel>
          <div className="flex gap-4">
            {tm.usage.toolUses != null && (
              <StatBadge value={String(tm.usage.toolUses)} label="工具调用" />
            )}
            {tm.usage.durationMs != null && (
              <StatBadge value={`${(tm.usage.durationMs / 1000).toFixed(1)}s`} label="执行时长" />
            )}
            {tm.usage.totalTokens != null && (
              <StatBadge value={String(tm.usage.totalTokens)} label="Tokens" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
