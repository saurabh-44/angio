import {
  Banknote,
  Cloud,
  Droplets,
  HandCoins,
  Leaf,
  MapPin,
  Sprout,
  TrendingUp,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import ChartCard from '@/components/charts/ChartCard.jsx';
import PlantedTrend from '@/components/charts/PlantedTrend.jsx';
import StatusDonut, { DonutLegend } from '@/components/charts/StatusDonut.jsx';
import DonationsBar from '@/components/charts/DonationsBar.jsx';
import MaintenanceWeeks from '@/components/charts/MaintenanceWeeks.jsx';
import HorizontalRanking from '@/components/charts/HorizontalRanking.jsx';
import { CHART } from '@/components/charts/chartTheme.js';
import { useAuth } from '@/lib/auth.jsx';
import { useAdminOverview } from '@/queries/analytics.js';
import { useSystemCo2 } from '@/queries/co2.js';
import { useSites } from '@/queries/sites.js';
import { formatAmount } from '@/lib/format.js';

function dash(v) {
  return v == null ? '—' : String(v);
}

export default function AdminHome() {
  const { user } = useAuth();
  const overview = useAdminOverview();
  const co2 = useSystemCo2();
  const sites = useSites({ limit: 1 });

  const data = overview.data;
  const totals = data?.totals;
  const statusData = data
    ? [
        { key: 'alive', name: 'Alive', value: data.treesByStatus.alive ?? 0 },
        { key: 'dead', name: 'Dead', value: data.treesByStatus.dead ?? 0 },
        { key: 'removed', name: 'Removed', value: data.treesByStatus.removed ?? 0 },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="NGO Admin"
        title={`Hi, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Live momentum across sponsors, sites, plants, and weekly maintenance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile
          className="lg:col-span-3"
          hero
          icon={Leaf}
          tone="leaf"
          value={dash(totals?.treesTotal)}
          label="Trees planted"
          sub={`${dash(data?.treesByStatus?.alive)} alive`}
        />
        <StatTile
          className="lg:col-span-3"
          icon={MapPin}
          tone="sky"
          value={dash(sites.data?.total)}
          label="Active sites"
        />
        <StatTile
          className="lg:col-span-3"
          icon={Banknote}
          tone="amber"
          value={totals ? formatAmount(totals.donationsTotal) : '—'}
          label="Donations received"
          sub={`${dash(totals?.donationCount)} payments`}
        />
        <StatTile
          className="lg:col-span-3"
          icon={Cloud}
          tone="leaf"
          value={co2.data?.summary?.co2Kg != null ? formatCo2(co2.data.summary.co2Kg) : '—'}
          label="CO₂ absorbed (est.)"
          sub={
            co2.data?.summary?.annualRateKg
              ? `${co2.data.summary.annualRateKg.toLocaleString()} kg/year`
              : undefined
          }
        />

        {/* Row 1 — momentum */}
        <ChartCard
          className="lg:col-span-8"
          eyebrow="Momentum"
          title="Trees planted"
          subtitle="Last 12 months"
          trailing={<TrendBadge data={data?.treesByMonth} />}
        >
          {overview.isLoading ? <ChartSkeleton /> : <PlantedTrend data={data?.treesByMonth ?? []} />}
        </ChartCard>

        <ChartCard
          className="lg:col-span-4"
          eyebrow="Status mix"
          title="Plants by status"
          subtitle="Live snapshot"
        >
          {overview.isLoading ? (
            <ChartSkeleton />
          ) : statusData.length === 0 ? (
            <EmptyChart icon={Leaf} message="No plants yet" />
          ) : (
            <>
              <div className="h-[180px]">
                <StatusDonut data={statusData} />
              </div>
              <DonutLegend data={statusData} />
            </>
          )}
        </ChartCard>

        {/* Row 2 — financial + ops */}
        <ChartCard
          className="lg:col-span-6"
          eyebrow="Inflow"
          title="Donations by month"
          subtitle="Paid donations only"
        >
          {overview.isLoading ? <ChartSkeleton /> : <DonationsBar data={data?.donationsByMonth ?? []} />}
        </ChartCard>

        <ChartCard
          className="lg:col-span-6"
          eyebrow="Field activity"
          title="Maintenance logs per week"
          subtitle="Last 12 weeks"
        >
          {overview.isLoading ? <ChartSkeleton /> : <MaintenanceWeeks data={data?.maintenanceByWeek ?? []} />}
        </ChartCard>

        {/* Row 3 — rankings */}
        <ChartCard
          className="lg:col-span-6"
          eyebrow="Coverage"
          title="Top sites by tree count"
          height={280}
        >
          {overview.isLoading ? (
            <ChartSkeleton />
          ) : (data?.topSites ?? []).length === 0 ? (
            <EmptyChart icon={MapPin} message="No plants on any site yet" />
          ) : (
            <HorizontalRanking data={data.topSites} valueLabel="Trees" color={CHART.primary} />
          )}
        </ChartCard>

        <div className="lg:col-span-6 bento-card p-5 sm:p-6">
          <div className="text-[10px] uppercase tracking-widest text-primary font-medium mb-1">
            Top contributors
          </div>
          <h3 className="font-heading text-base font-semibold mb-4">Sponsors & volunteers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Leaderboard
              icon={HandCoins}
              title="Sponsors by amount"
              rows={(data?.topDonors ?? []).map((d) => ({
                primary: d.name,
                secondary: d.email,
                value: formatAmount(d.amount),
              }))}
              emptyText="No paid donations yet"
              isLoading={overview.isLoading}
            />
            <Leaderboard
              icon={Sprout}
              title="Volunteers by trees planted"
              rows={(data?.topVolunteers ?? []).map((v) => ({
                primary: v.name,
                value: `${v.count} tree${v.count === 1 ? '' : 's'}`,
              }))}
              emptyText="No plantings recorded yet"
              isLoading={overview.isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function formatCo2(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${Math.round(kg)} kg`;
}

// Tiny month-over-month delta chip surfaced in the planted-trend
// header so the admin can read momentum without reading the chart.
function TrendBadge({ data }) {
  if (!data || data.length < 2) return null;
  const last = data[data.length - 1]?.planted ?? 0;
  const prev = data[data.length - 2]?.planted ?? 0;
  const delta = last - prev;
  if (delta === 0 && last === 0) return null;
  const positive = delta >= 0;
  return (
    <Badge variant={positive ? 'success' : 'destructive'}>
      <TrendingUp className={`h-3 w-3 ${positive ? '' : 'rotate-180'}`} aria-hidden />
      {positive ? '+' : ''}
      {delta} mo/mo
    </Badge>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-full w-full rounded-xl" />;
}

function EmptyChart({ icon: Icon, message }) {
  return (
    <div className="h-full grid place-items-center text-muted-foreground text-sm">
      <div className="text-center">
        <Icon className="h-6 w-6 mx-auto mb-1.5 opacity-70" aria-hidden />
        {message}
      </div>
    </div>
  );
}

function Leaderboard({ icon: Icon, title, rows, emptyText, isLoading }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h4 className="font-heading text-sm font-semibold text-foreground">{title}</h4>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">{emptyText}</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-semibold text-muted-foreground/80 w-4">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{row.primary}</div>
                  {row.secondary && (
                    <div className="text-[11px] text-muted-foreground truncate">{row.secondary}</div>
                  )}
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                {row.value}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
