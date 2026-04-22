export function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 minute
  if (diff < 60_000) return '刚刚';

  // Less than 1 hour — show relative
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;

  // Less than 24 hours — show relative
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;

  // Older — show full date time in 24h format
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  const currentYear = new Date().getFullYear();
  if (y === currentYear) {
    return `${m}-${d} ${h}:${min}`;
  }
  return `${y}-${m}-${d} ${h}:${min}`;
}
