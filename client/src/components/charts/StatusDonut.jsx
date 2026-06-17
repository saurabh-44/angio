import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART, TOOLTIP_STYLE } from './chartTheme.js';

const COLOR_BY_KEY = {
  alive: CHART.primary,
  dead: CHART.destructive,
  removed: CHART.muted,
};

// Donut chart for `{ alive, dead, removed }`. The centre label is
// rendered as plain DOM so it inherits our Tailwind typography rather
// than recharts' SVG text.
export default function StatusDonut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, _name, item) => [`${value}`, item.payload.name]}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            stroke="#fff"
            strokeWidth={2}
            paddingAngle={2}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={COLOR_BY_KEY[d.key] ?? CHART.muted} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 grid place-items-center pointer-events-none">
        <div className="text-center">
          <div className="font-heading text-3xl font-bold text-foreground">{total}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
            total trees
          </div>
        </div>
      </div>
    </div>
  );
}

// Small legend row for the donut.
export function DonutLegend({ data }) {
  return (
    <ul className="flex flex-wrap gap-3 mt-3 justify-center">
      {data.map((d) => (
        <li key={d.key} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: COLOR_BY_KEY[d.key] ?? CHART.muted }}
            aria-hidden
          />
          <span className="text-muted-foreground">{d.name}</span>
          <span className="text-foreground font-medium tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}
