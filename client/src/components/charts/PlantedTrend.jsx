import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AXIS_STYLE,
  CHART,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from './chartTheme.js';
import { useIsMobile } from '@/lib/useIsMobile.js';

// Monthly tree-planting trend. Area fill with a soft gradient so the
// shape reads at a glance — admins care about momentum more than
// individual month values.
export default function PlantedTrend({ data }) {
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="plantedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          interval={isMobile ? 'preserveStartEnd' : 0}
          minTickGap={isMobile ? 24 : 5}
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          width={32}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ stroke: CHART.primarySoft, strokeWidth: 2 }}
          formatter={(value) => [`${value} trees`, 'Planted']}
        />
        <Area
          type="monotone"
          dataKey="planted"
          stroke={CHART.primary}
          strokeWidth={2.5}
          fill="url(#plantedFill)"
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
