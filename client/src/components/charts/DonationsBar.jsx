import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS_STYLE, CHART, TOOLTIP_LABEL_STYLE, TOOLTIP_STYLE } from './chartTheme.js';
import { formatAmount } from '@/lib/format.js';

// Monthly donation revenue. Rounded bars + amber fill so it doesn't
// fight the green planted-trend chart sitting next to it.
export default function DonationsBar({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={44}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: 'rgba(245,158,11,0.08)' }}
          formatter={(value, name) => {
            if (name === 'amount') return [formatAmount(value), 'Amount'];
            return [value, 'Donations'];
          }}
        />
        <Bar dataKey="amount" fill={CHART.accent} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
