import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Filter, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { useSiteOverview } from '@/queries/sites.js';
import { openAuthedPdf } from '@/lib/nativeFile.js';
import { formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const STATUS_PILL = {
  completed: 'bg-[#0B5000]/10 text-[#0B5000]',
  in_progress: 'bg-[#346EC4]/10 text-[#346EC4]',
  pending: 'bg-amber-100 text-amber-700',
};
const STATUS_LABEL = {
  completed: 'Completed',
  in_progress: 'In Progress',
  pending: 'Pending',
};

export default function SiteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { error: toastError } = useToast();
  const { data, isLoading, isError, refetch } = useSiteOverview(id);

  // Same page serves NGO admin (/admin/...) and site owner (/site/...).
  const isAdmin = role === 'ngo_admin';
  const base = isAdmin ? '/admin' : '/site';

  const site = data?.site;
  const stats = data?.stats;
  const recordedOn = formatDate(site?.updatedAt ?? new Date());

  async function downloadReport() {
    try {
      await openAuthedPdf(`/api/sites/${id}/qr-sheet.pdf`, `site-${id}.pdf`);
    } catch (err) {
      toastError('Could not open report', err?.message ?? 'Please try again.');
    }
  }

  if (isError) {
    return (
      <div className="mt-10" style={{ fontFamily: BODY_FONT }}>
        <EmptyState
          title="Couldn't load this site"
          description="Check your connection and try again."
          action={
            <button
              onClick={() => refetch()}
              className="rounded-[10px] bg-[#001F00] px-5 py-3 text-sm font-medium text-white"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      {/* Header: back + title on the left. Download Report sits on its own
          right-aligned line just below the floating user chip, so the two
          never overlap. */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(`${base}/sites`)}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[10px] border border-[#B4B4B4] text-[#1E1E1E] transition-colors hover:border-[#0B5000] hover:text-[#0B5000]"
          aria-label="Back to sites"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <>
              <h1 className="truncate text-2xl font-medium text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
                {site?.name}
              </h1>
              <p className="truncate text-base text-[#1E1E1E]/50">
                {[site?.address, site?.city, site?.state, site?.pinCode].filter(Boolean).join(', ') ||
                  'No address on file'}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={downloadReport}
          className="inline-flex h-[52px] items-center gap-2 rounded-[10px] border border-[#B4B4B4] px-5 text-base text-[#1E1E1E]/70 transition-colors hover:border-[#0B5000] hover:text-[#0B5000]"
        >
          <Download className="h-5 w-5" aria-hidden /> Download Report
        </button>
      </div>

      {/* Site Details + Site Status */}
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <InfoCard title="Site Details" loading={isLoading}>
          <InfoRow label="Name" value={site?.name} />
          <InfoRow label="Address" value={site?.address ?? '—'} />
          <InfoRow label="City" value={site?.city ?? '—'} />
          <InfoRow label="State" value={site?.state ?? '—'} />
          <InfoRow label="Country" value={site?.country ?? '—'} />
          <InfoRow label="Pin code" value={site?.pinCode ?? '—'} />
        </InfoCard>
        <InfoCard title="Site Status" loading={isLoading}>
          <InfoRow label="Site Incharge" value={site?.owner?.name ?? '—'} />
          <InfoRow label="Pending Orders" value={String(stats?.pendingOrders ?? 0)} />
          <InfoRow label="Last Update" value={formatDate(site?.updatedAt)} muted />
          <InfoRow label="Created On" value={formatDate(site?.createdAt)} muted />
        </InfoCard>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="CO₂ Absorbed" value={`${stats?.co2Kg ?? 0}Kg`} recordedOn={recordedOn} loading={isLoading} />
        <StatCard label="Total Trees" value={stats?.totalTrees ?? 0} recordedOn={recordedOn} loading={isLoading} />
        <StatCard
          label="Tree Survival Rate"
          value={
            <>
              {stats?.aliveTrees ?? 0}
              <span className="text-2xl font-medium text-[#001F00]/70">/{stats?.totalTrees ?? 0}</span>
            </>
          }
          recordedOn={recordedOn}
          loading={isLoading}
        />
        <StatCard label="Total Volunteers" value={stats?.volunteerCount ?? 0} recordedOn={recordedOn} loading={isLoading} />
      </div>

      {/* Tree Record */}
      <RecordsTable
        title="Tree Record"
        searchPlaceholder="Tree ID, Date etc.."
        viewAllTo={`${base}/plants`}
        loading={isLoading}
        rows={data?.trees ?? []}
        searchText={(r) => `${r.code} ${r.plantedBy} ${r.name}`}
        emptyText="No trees planted on this site yet."
        onRowClick={{ enabled: (r) => !!r.id, go: (r) => navigate(`${base}/plants/${r.id}`) }}
        columns={[
          { label: 'Tree ID', render: (r) => `#${r.code}` },
          { label: 'Planted On', render: (r) => formatDate(r.plantedAt) },
          { label: 'Last Watered', render: (r) => (r.lastWateredAt ? formatDate(r.lastWateredAt) : '—') },
          { label: 'CO₂ Absorption', render: (r) => `${r.co2Kg} Kg` },
          { label: 'Planted By', render: (r) => r.plantedBy },
        ]}
      />

      {/* Contributors */}
      <RecordsTable
        title="Contributors"
        searchPlaceholder="Name, Email, Date etc.."
        viewAllTo={isAdmin ? '/admin/donations' : undefined}
        loading={isLoading}
        rows={data?.contributors ?? []}
        searchText={(r) => `${r.name} ${r.email}`}
        emptyText="No contributions to this site yet."
        onRowClick={{
          enabled: (r) => isAdmin && !!r.donorId,
          go: (r) => navigate(`/admin/donations?donor=${r.donorId}`),
        }}
        columns={[
          { label: 'Name', render: (r) => r.name },
          { label: 'Date', render: (r) => formatDate(r.date) },
          { label: 'Order Value', render: (r) => `${r.treeCount} tree${r.treeCount === 1 ? '' : 's'}` },
          { label: 'Email ID', render: (r) => r.email },
          {
            label: 'Status',
            render: (r) => (
              <span
                className={cn(
                  'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                  STATUS_PILL[r.status] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
                )}
              >
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            ),
          },
        ]}
      />

      {/* Volunteers */}
      <RecordsTable
        title="Volunteers"
        searchPlaceholder="Name, Email, Date etc.."
        viewAllTo={isAdmin ? '/admin/assignments' : '/site/volunteers'}
        loading={isLoading}
        rows={data?.volunteers ?? []}
        searchText={(r) => `${r.name} ${r.email}`}
        emptyText="No volunteers assigned to this site yet."
        onRowClick={{
          enabled: (r) => isAdmin && !!r.email,
          go: (r) => navigate(`/admin/users?q=${encodeURIComponent(r.email)}`),
        }}
        columns={[
          { label: 'Name', render: (r) => r.name },
          { label: 'Date', render: (r) => formatDate(r.assignedAt) },
          { label: 'Email ID', render: (r) => r.email },
          { label: 'Task', render: (r) => <span className="capitalize">{r.kind}</span> },
        ]}
      />
    </div>
  );
}

function InfoCard({ title, children, loading }) {
  return (
    <section className="rounded-[10px] bg-white p-6 shadow-[0_0_20px_rgba(0,0,0,0.08)]">
      <h2 className="text-xl font-medium text-[#001F00]">{title}</h2>
      <div className="mt-5 space-y-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
          : children}
      </div>
    </section>
  );
}

function InfoRow({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-base font-medium text-[#1E1E1E]">{label}</span>
      <span className={cn('truncate text-right', muted ? 'text-xs text-[#1E1E1E]/60' : 'text-base text-[#1E1E1E]')}>
        {value}
      </span>
    </div>
  );
}

function StatCard({ label, value, recordedOn, loading }) {
  return (
    <div className="flex min-h-[200px] flex-col justify-between rounded-[10px] bg-white p-6 shadow-[0_0_20px_rgba(0,0,0,0.08)]">
      <div className="text-base font-medium text-[#001F00]">{label}</div>
      <div>
        {loading ? (
          <Skeleton className="h-12 w-20" />
        ) : (
          <div className="text-5xl font-bold leading-none text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            {value}
          </div>
        )}
        <div className="mt-3 text-sm font-light text-[#1E1E1E]/45">Recorded On {recordedOn}</div>
      </div>
    </div>
  );
}

// White card holding a searchable table with a "View All" link.
function RecordsTable({ title, searchPlaceholder, viewAllTo, columns, rows, searchText, emptyText, loading, onRowClick }) {
  const [q, setQ] = useState('');
  const filtered = q
    ? rows.filter((r) => searchText(r).toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <section className="mt-6 rounded-[10px] bg-white p-6 shadow-[0_0_20px_rgba(0,0,0,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-medium text-[#001F00]">{title}</h2>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="rounded-[10px] border border-[#B4B4B4] px-5 py-2.5 text-sm text-[#1E1E1E] transition-colors hover:border-[#0B5000] hover:text-[#0B5000]"
          >
            View All
          </Link>
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B4B4B4]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-[10px] border border-[#B4B4B4] py-3 pl-12 pr-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
          />
        </div>
        <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[10px] border border-[#B4B4B4] text-[#B4B4B4]">
          <Filter className="h-5 w-5" aria-hidden />
        </span>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-[10px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-5 py-10 text-center text-sm text-[#1E1E1E]/50">
          {q ? 'No matches.' : emptyText}
        </p>
      ) : (
        <>
          {/* Desktop table (lg and up) */}
          <div className="mt-5 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.label}
                      className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1"
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="pb-4 text-right text-base font-medium text-[#001F00]">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const clickable = onRowClick && onRowClick.enabled(row);
                  return (
                    <tr
                      key={row.id ?? i}
                      onClick={clickable ? () => onRowClick.go(row) : undefined}
                      className={cn(
                        'border-t border-[#E2E8F0]',
                        clickable && 'cursor-pointer transition-colors hover:bg-[#F6FAF6]',
                      )}
                    >
                      {columns.map((c) => (
                        <td key={c.label} className="py-4 pr-4 text-sm text-[#1E1E1E] first:pl-1">
                          {c.render(row)}
                        </td>
                      ))}
                      <td className="py-4 text-right">
                        <ChevronRight
                          className={cn(
                            'ml-auto h-5 w-5',
                            clickable ? 'text-[#0B5000]' : 'text-[#1E1E1E]/30',
                          )}
                          aria-hidden
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (below lg) */}
          <div className="mt-5 space-y-3 lg:hidden">
            {filtered.map((row, i) => {
              const clickable = onRowClick && onRowClick.enabled(row);
              const [first, ...rest] = columns;
              return (
                <div
                  key={row.id ?? i}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onRowClick.go(row) : undefined}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] p-4',
                    clickable && 'cursor-pointer transition-colors hover:border-[#001F00]/40',
                  )}
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="text-sm font-medium text-[#001F00]">{first.render(row)}</div>
                    {rest.map((c) => (
                      <div key={c.label} className="flex flex-wrap items-center gap-x-2 text-xs">
                        <span className="text-[#1E1E1E]/50">{c.label}:</span>
                        <span className="text-[#1E1E1E]">{c.render(row)}</span>
                      </div>
                    ))}
                  </div>
                  <ChevronRight
                    className={cn('h-5 w-5 shrink-0', clickable ? 'text-[#0B5000]' : 'text-[#1E1E1E]/20')}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
