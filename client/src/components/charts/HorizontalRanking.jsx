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

// Horizontal-bar ranking (top sites by tree count, top volunteers by
// plantings, etc.). Caller supplies `[{ name, count }]` already sorted
// descending. `valueLabel` is the tooltip label so we don't bake "trees"
// in as a constant.
export default function HorizontalRanking({ data, valueLabel = 'Count', color }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        <CartesianGrid stroke={CHART.grid} horizontal={false} />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={AXIS_STYLE}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={AXIS_STYLE}
          width={92}
          interval={0}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: 'rgba(5,150,105,0.06)' }}
          formatter={(value) => [value, valueLabel]}
        />
        <Bar
          dataKey="count"
          fill={color ?? CHART.primary}
          radius={[0, 6, 6, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
