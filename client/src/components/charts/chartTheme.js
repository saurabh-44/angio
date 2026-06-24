// Centralised palette for every chart so the admin dashboard, donor
// dashboard, and any future analytics page all share the same brand.
// Hex values pulled from the Tailwind config (leaf-*, amber-*) so the
// hard-coded chart colours don't drift from the design system.

export const CHART = {
  primary: '#0B5000', // brand deep green
  primaryStrong: '#063600', // darker green
  primarySoft: '#C7E3C0', // soft green tint
  accent: '#F59E0B', // amber-500
  accentSoft: '#FCD34D', // amber-300
  warn: '#FBBF24', // amber-400
  destructive: '#DC2626', // red-600
  muted: '#94A3B8', // slate-400
  surface: '#FFFFFF',
  border: '#E2E8F0', // slate-200
  text: '#001F00', // dark green
  mutedText: '#64748B', // slate-500
  grid: '#F1F5F9', // slate-100
};

// Tooltip style applied to every recharts <Tooltip /> so we don't drift.
export const TOOLTIP_STYLE = {
  background: CHART.surface,
  border: `1px solid ${CHART.border}`,
  borderRadius: 12,
  boxShadow: '0 4px 24px -8px rgba(15,23,42,0.12)',
  padding: '10px 12px',
  fontSize: 12,
};

export const TOOLTIP_LABEL_STYLE = {
  fontWeight: 600,
  color: CHART.text,
  marginBottom: 4,
};

export const AXIS_STYLE = {
  fontSize: 11,
  fill: CHART.mutedText,
};
