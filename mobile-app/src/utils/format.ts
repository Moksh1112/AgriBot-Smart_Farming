export function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function timeAgo(value?: string | null) {
  if (!value) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (Number.isNaN(seconds)) return 'unknown';
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86400)} d ago`;
}

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function round1(value: number | null | undefined) {
  return typeof value === 'number' ? (Math.round(value * 10) / 10).toString() : '—';
}
