import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, HandCoins, Leaf, MapPin, Sprout, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth.jsx';
import { useSites } from '@/queries/sites.js';
import { usePlants } from '@/queries/plants.js';
import { useAssignments } from '@/queries/assignments.js';
import { useAllocations } from '@/queries/donations.js';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import AttachTreesPanel from '@/components/AttachTreesPanel.jsx';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

function dash(v) {
  return v == null ? '—' : String(v);
}

function StatCard({ icon: Icon, value, label, loading }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B5000]/10 text-[#0B5000]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-9 w-16" />
      ) : (
        <div className="mt-4 text-4xl font-bold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          {value}
        </div>
      )}
      <div className="mt-1 text-sm text-[#1E1E1E]/60">{label}</div>
    </div>
  );
}

// A single pending order on the incharge's site: shows who ordered, how many
// trees are still needed, and lets the incharge assign existing unassigned
// trees to it. Fulfilling it moves the order to the Completed list.
function OrderRequestCard({ allocation }) {
  const [open, setOpen] = useState(false);
  const id = allocation.id ?? allocation._id;
  const target = allocation.targetPlants ?? 0;
  const planted = allocation.planted ?? 0;
  const remaining = allocation.remaining ?? Math.max(0, target - planted);
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-[#001F00]">
            {allocation.donor?.name ?? 'Sponsor'}
          </div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[#1E1E1E]/50">
            <MapPin className="h-3 w-3" aria-hidden />
            {allocation.site?.name ?? 'Site'} · {target} tree{target === 1 ? '' : 's'} requested
          </div>
        </div>
        <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
          {planted}/{target} assigned · {remaining} to go
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0B5000] transition-colors hover:text-[#094200]"
        aria-expanded={open}
      >
        <Sprout className="h-3.5 w-3.5" aria-hidden />
        Assign trees to this order
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <AttachTreesPanel allocationId={id} onDone={() => setOpen(false)} />}
    </div>
  );
}

export default function SiteHome() {
  const { user } = useAuth();
  const sites = useSites({ limit: 50 });
  const plants = usePlants({ limit: 1 });
  const assignments = useAssignments({ limit: 1, active: true });
  // Orders/allocations on this incharge's site(s) — the backend scopes this to
  // the sites they own and includes planted/remaining/fulfilled per order.
  const orders = useAllocations({ limit: 100 });

  const allocItems = orders.data?.items ?? [];
  const pending = allocItems.filter((a) => !a.fulfilled);
  const completed = allocItems.filter((a) => a.fulfilled);

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Site Owner</div>
        <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Hi, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-base text-[#1E1E1E]/50">
          Your sites, volunteers, order requests, and maintenance progress.
        </p>
      </PageHeading>

      {/* The site(s) this incharge manages — shown by name so it's clear at a
          glance which sites are theirs. Tap one to open its full record. */}
      {sites.data?.items?.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[#1E1E1E]/50">
            Your site{sites.data.items.length === 1 ? '' : 's'}:
          </span>
          {sites.data.items.map((s) => {
            const id = s.id ?? s._id;
            return (
              <Link
                key={id}
                to={`/site/sites/${id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B5000]/10 px-3 py-1 text-sm font-medium text-[#0B5000] transition-colors hover:bg-[#0B5000]/20"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {s.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MapPin}
          value={dash(sites.data?.total)}
          label="Sites you manage"
          loading={sites.isLoading}
        />
        <StatCard
          icon={Leaf}
          value={dash(plants.data?.total)}
          label="Trees on your sites"
          loading={plants.isLoading}
        />
        <StatCard
          icon={Users}
          value={dash(assignments.data?.total)}
          label="Active volunteers"
          loading={assignments.isLoading}
        />
        <StatCard
          icon={HandCoins}
          value={orders.isLoading ? '—' : String(pending.length)}
          label="Open order requests"
          loading={orders.isLoading}
        />
      </div>

      {/* Order requests on this incharge's sites (incl. admin's offline orders).
          Assign existing unassigned trees here; fulfilled ones drop to Completed. */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-[#0B5000]" aria-hidden />
          <h2 className="text-base font-semibold text-[#001F00]">Order requests</h2>
          {pending.length > 0 && (
            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {pending.length} pending
            </span>
          )}
        </div>

        {orders.isLoading ? (
          <Skeleton className="mt-3 h-24 w-full rounded-[10px]" />
        ) : allocItems.length === 0 ? (
          <p className="mt-3 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] px-4 py-4 text-sm text-[#1E1E1E]/60">
            No sponsor orders on your sites yet. When the NGO admin records an order for one of your
            sites, it appears here to fulfil.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {pending.length === 0 ? (
              <p className="rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] px-4 py-3 text-sm text-[#1E1E1E]/60">
                No pending order requests — you're all caught up.
              </p>
            ) : (
              pending.map((a) => <OrderRequestCard key={a.id ?? a._id} allocation={a} />)
            )}

            {completed.length > 0 && (
              <details className="rounded-[10px] border border-[#E2E8F0] bg-white">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-[#001F00]">
                  <CheckCircle2 className="h-4 w-4 text-[#0B5000]" aria-hidden />
                  Completed orders ({completed.length})
                </summary>
                <ul className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                  {completed.map((a) => (
                    <li
                      key={a.id ?? a._id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-[#001F00]">{a.donor?.name ?? 'Sponsor'}</span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#1E1E1E]/50">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {a.site?.name ?? 'Site'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#0B5000]/10 px-2.5 py-0.5 text-xs font-medium text-[#0B5000]">
                        <CheckCircle2 className="h-3 w-3" aria-hidden /> {a.targetPlants} planted
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
