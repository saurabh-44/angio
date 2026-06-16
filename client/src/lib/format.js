// Shared display helpers used across dashboard pages.

export function formatDate(value, opts = {}) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatRelative(value) {
  if (!value) return '—';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

// We intentionally don't pin a currency symbol — the NGO records cash/UPI
// donations in their own currency. We show the number with comma grouping
// and a "₹" prefix as a reasonable default for India.
export function formatAmount(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export function formatGeo(geo) {
  if (!geo || geo.lat == null || geo.lng == null) return '—';
  return `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`;
}
