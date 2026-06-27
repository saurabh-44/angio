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
import { useIsMobile } from '@/lib/useIsMobile.js';

// Weekly maintenance-log throughput. We use a cool secondary tint so
// this chart sits visually between donations (amber) and trees (green)
// in the dashboard hierarchy.
export default function MaintenanceWeeks({ data }) {
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tick={AXIS_STYLE}
          interval={isMobile ? 'preserveStartEnd' : 0}
          minTickGap={isMobile ? 24 : 5}
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
          cursor={{ fill: 'rgba(5,150,105,0.06)' }}
          formatter={(value) => [`${value} logs`, 'Maintenance']}
        />
        <Bar
          dataKey="count"
          fill={CHART.primaryStrong}
          radius={[6, 6, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
