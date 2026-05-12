import type { TeammateState } from '@/types';

export const STATUS_COLORS: Record<TeammateState['status'], string> = {
  running: '#007AFF',
  completed: '#34C759',
  failed: '#FF3B30',
  stopped: '#FF9500',
};

export const STATUS_BG: Record<TeammateState['status'], string> = {
  running: 'bg-[#007AFF]/10',
  completed: 'bg-[#34C759]/10',
  failed: 'bg-[#FF3B30]/10',
  stopped: 'bg-[#FF9500]/10',
};

export const STATUS_LABEL: Record<TeammateState['status'], string> = {
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止',
};

export const AVATAR_COLORS = ['#007AFF', '#AF52DE', '#FF9500', '#34C759', '#FF3B30', '#5856D6'];

export function avatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function formatElapsed(startedAt: number, endedAt?: number): string {
  const end = endedAt ?? Date.now();
  const diffMs = end - startedAt;
  if (diffMs < 1000) return '0s';
  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s`;
  if (diffMs < 3_600_000) {
    const mins = Math.floor(diffMs / 60_000);
    const secs = Math.floor((diffMs % 60_000) / 1000);
    return `${mins}m ${secs}s`;
  }
  return `${Math.floor(diffMs / 3_600_000)}h`;
}

export function teammateName(tm: TeammateState): string {
  return tm.description || `Agent ${tm.index + 1}`;
}
