import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import { useState } from 'react';
import { HandCoins } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { useDonations } from '@/queries/donations.js';
import { formatAmount, formatDate } from '@/lib/format.js';

const LIMIT = 20;

export default function DonorDonations() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useDonations({ page, limit: LIMIT });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lifetimeTotal = items.reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Your contributions"
        title="Donations"
        description="A record of every donation the NGO has logged for you."
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No donations recorded yet"
          description="When the NGO logs your contribution, it'll appear here."
        />
      ) : (
        <div className="bento-card overflow-hidden">
          <div className="p-6 surface-biophilic border-b border-border/60">
            <div className="text-xs uppercase tracking-widest text-primary font-medium">
              Recorded this page
            </div>
            <div className="mt-1 font-heading text-3xl font-bold text-foreground tracking-tight">
              {formatAmount(lifetimeTotal)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {items.length} {items.length === 1 ? 'donation' : 'donations'}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40">
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date received</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id ?? d._id}>
                  <TableCell className="font-heading text-base font-semibold text-foreground">
                    {formatAmount(d.amount)}
                  </TableCell>
                  <TableCell><Badge variant="muted" className="capitalize">{d.method?.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(d.paidAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(d.createdAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                    {d.note ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t border-border/60 px-4">
            <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
          </div>
        </div>
      )}
    </>
  );
}
