import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Cloud, Droplets, HandCoins, Leaf, MapPin, TreePine } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { Badge } from '@/components/ui/badge.jsx';
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

// Maps the server's derived order status onto a label + badge variant.
const STATUS_META = {
  pending: { label: 'Payment pending', variant: 'muted' },
  processing: { label: 'Processing', variant: 'outline' },
  yet_to_plant: { label: 'Yet to plant', variant: 'outline' },
  in_progress: { label: 'Planting in progress', variant: 'accent' },
  planted: { label: 'Planted', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  refunded: { label: 'Refunded', variant: 'muted' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, variant: 'muted' };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default function SponsorOrders() {
  const { data, isLoading } = useSponsorOrders();
  const orders = data?.items ?? [];
  const [open, setOpen] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="Your sponsorships"
        title="Orders"
        description="Every order you've placed, with planting status and estimated CO₂ absorbed. Tap one for the full report."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No orders yet"
          description="Sponsor your first trees and they'll show up here with live planting status."
          action={
            <Button asChild>
              <Link to="/sponsor/sponsor"><TreePine className="h-4 w-4" /> Sponsor trees</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setOpen(o)}
              className="w-full text-left bento-card p-4 sm:p-5 flex flex-wrap items-center gap-4 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
                <Leaf className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-sm font-semibold text-foreground">
                  {o.treeCount} {o.treeCount === 1 ? 'tree' : 'trees'}
                  {o.site?.name && <span className="text-muted-foreground font-normal"> · {o.site.name}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(o.date)} · {formatAmount(o.amount)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-muted-foreground">CO₂</div>
                  <div className="text-sm font-medium text-foreground">{o.co2Kg ?? 0} kg</div>
                </div>
                <StatusBadge status={o.status} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
            </button>
          ))}
        </div>
      )}

      <OrderReportSheet order={open} onClose={() => setOpen(null)} />
    </>
  );
}

function OrderReportSheet({ order, onClose }) {
  if (!order) return null;
  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-primary" aria-hidden /> Order report
          </SheetTitle>
          <SheetDescription>{order.site?.name ?? 'Awaiting site placement'}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto pr-1 space-y-5">
          <dl className="rounded-2xl border border-border/60 bg-secondary/30 p-5 space-y-2.5 text-sm">
            <Row label="Date" value={formatDate(order.date)} />
            <Row label="No. of trees" value={`${order.treeCount}`} />
            <Row label="Planted" value={`${order.planted} of ${order.target}`} />
            <Row label="Amount" value={formatAmount(order.amount)} />
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd><StatusBadge status={order.status} /></dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 mt-1">
              <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Cloud className="h-4 w-4" aria-hidden /> CO₂ absorbed
              </dt>
              <dd className="font-heading text-lg font-bold text-foreground">{order.co2Kg ?? 0} kg</dd>
            </div>
          </dl>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
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
    <Button asChild variant="outline" className="w-full justify-between">
      <Link to={to}>
        <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}
