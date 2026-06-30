import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  ChevronRight,
  Cloud,
  Droplets,
  HandCoins,
  MapPin,
  Plus,
  SlidersHorizontal,
  TreePine,
} from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { useSponsorOrders } from '@/queries/payments.js';
import { formatAmount, formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

// Maps the server's derived order status onto a label + pill colour (new theme).
const STATUS_META = {
  pending: { label: 'Payment pending', cls: 'bg-amber-100 text-amber-700' },
  processing: { label: 'Processing', cls: 'bg-[#E2E8F0] text-[#1E1E1E]' },
  yet_to_plant: { label: 'Yet to plant', cls: 'bg-[#0B5000]/10 text-[#0B5000]' },
  in_progress: { label: 'Planting in progress', cls: 'bg-amber-100 text-amber-700' },
  planted: { label: 'Planted', cls: 'bg-[#0B5000] text-white' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  refunded: { label: 'Refunded', cls: 'bg-[#E2E8F0] text-[#1E1E1E]' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  // Never render a blank pill — humanise any unknown value, default to "Unknown".
  const label =
    meta?.label ??
    (status
      ? String(status).replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
      : 'Unknown');
  const cls = meta?.cls ?? 'bg-[#E2E8F0] text-[#1E1E1E]';
  return (
    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium', cls)}>
      {label}
    </span>
  );
}

const shortId = (id) => (id ? `#${String(id).slice(-6)}` : '—');
const typeLabel = (o) => (o.treeCount === 1 ? 'Single Tree' : 'Multiple Trees');

// Grid template shared by the table header + rows.
const COLS = 'grid grid-cols-[1.4fr_1fr_1.2fr_1.2fr_0.5fr] items-center gap-4';

export default function SponsorOrders() {
  const { data, isLoading } = useSponsorOrders();
  const orders = data?.items ?? [];
  const total = data?.total ?? orders.length;
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((o) =>
      [shortId(o.id), formatDate(o.date), o.site?.name, typeLabel(o)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [orders, q]);

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Past Contributions <span className="font-normal">•&nbsp;{total}</span>
        </h1>
      </PageHeading>

      {/* Search + filter + new */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="OrderID, Date, Site..."
            aria-label="Search contributions"
            className="w-full max-w-[381px] rounded-[10px] border border-[#B4B4B4] px-5 py-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
          />
          <button
            type="button"
            aria-label="Filter"
            className="grid h-[58px] w-[64px] shrink-0 place-items-center rounded-[10px] border border-[#B4B4B4] text-[#B4B4B4] transition-colors hover:text-[#001F00]"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <Link
          to="/sponsor/sponsor"
          className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#001F00] px-6 py-4 text-base font-medium text-[#F8FDFF] transition-colors hover:bg-[#0B5000] sm:w-auto sm:justify-start"
        >
          <Plus className="h-5 w-5" aria-hidden /> New Contribution
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={HandCoins}
            title="No contributions yet"
            description="Sponsor your first trees and they'll show up here with live planting status."
            action={
              <Button asChild>
                <Link to="/sponsor/sponsor">
                  <TreePine className="h-4 w-4" /> Sponsor trees
                </Link>
              </Button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 border-t border-[#E2E8F0] px-3 py-10 text-center text-base text-[#1E1E1E]/50">
          No contributions match “{q}”.
        </p>
      ) : (
        <>
          {/* Desktop table (lg and up) */}
          <div className="mt-10 hidden overflow-x-auto lg:block">
            <div className="min-w-[700px]">
              <div className={`${COLS} px-3 pb-4 text-base text-[#001F00]`}>
                <span>Date</span>
                <span>Order ID</span>
                <span>Type</span>
                <span>CO₂ Absorbed</span>
                <span className="text-right">View More</span>
              </div>
              {filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOpen(o)}
                  className={`${COLS} w-full border-t border-[#E2E8F0] px-3 py-5 text-left text-base text-[#001F00] transition-colors hover:bg-[#0B5000]/[0.03]`}
                >
                  <span>{formatDate(o.date)}</span>
                  <span className="truncate">{shortId(o.id)}</span>
                  <span>{typeLabel(o)}</span>
                  <span>{Math.round(o.co2Kg ?? 0)}Kg</span>
                  <span className="flex justify-end text-[#001F00]">
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile cards (below lg) */}
          <div className="mt-8 space-y-3 lg:hidden">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setOpen(o)}
                className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] p-4 text-left transition-colors hover:border-[#001F00]/40"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[#001F00]">{typeLabel(o)}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#1E1E1E]/60">
                    <span>{formatDate(o.date)}</span>
                    <span>{shortId(o.id)}</span>
                    <span>{Math.round(o.co2Kg ?? 0)}Kg CO₂</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#0B5000]" aria-hidden />
              </button>
            ))}
          </div>
        </>
      )}

      <OrderReportSheet order={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function OrderReportSheet({ order, onClose }) {
  if (!order) return null;
  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle
            className="flex items-center gap-2 text-[#001F00]"
            style={{ fontFamily: HEADING_FONT }}
          >
            <TreePine className="h-5 w-5 text-[#0B5000]" aria-hidden /> Order report
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">
            {order.site?.name ?? 'Awaiting site placement'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          <dl className="space-y-3 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-5 text-base">
            <Row label="Date" value={formatDate(order.date)} />
            <Row label="Order ID" value={shortId(order.id)} />
            <Row label="Type" value={typeLabel(order)} />
            <Row label="No. of trees" value={`${order.treeCount}`} />
            <Row label="Planted" value={`${order.planted} of ${order.target}`} />
            <Row label="Amount" value={formatAmount(order.amount)} />
            <Row label="Status" value={<StatusBadge status={order.status} />} />
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
              <dt className="inline-flex items-center gap-1.5 text-[#1E1E1E]/60">
                <Cloud className="h-4 w-4" aria-hidden /> CO₂ absorbed
              </dt>
              <dd className="text-xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
                {Math.round(order.co2Kg ?? 0)} kg
              </dd>
            </div>
          </dl>

          <div className="space-y-2.5">
            <p className="text-xs font-medium uppercase tracking-widest text-[#1E1E1E]/50">
              Track your trees
            </p>
            <TrackLink to="/sponsor/trees" icon={Camera} label="Planting photos" />
            <TrackLink to="/sponsor/map" icon={MapPin} label="Map of your trees" />
            <TrackLink to="/sponsor/maintenance" icon={Droplets} label="Weekly maintenance" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TrackLink({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-[10px] border border-[#E2E8F0] px-5 py-3.5 text-base text-[#001F00] transition-colors hover:border-[#001F00] hover:bg-[#0B5000]/[0.03]"
    >
      <span className="inline-flex items-center gap-2.5">
        <Icon className="h-5 w-5" aria-hidden /> {label}
      </span>
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#1E1E1E]/60">{label}</dt>
      <dd className="text-right font-medium text-[#001F00]">{value}</dd>
    </div>
  );
}
