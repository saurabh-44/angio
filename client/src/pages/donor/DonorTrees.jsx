import { useState } from 'react';
import { Filter, Leaf, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import PlantCard from '@/components/PlantCard.jsx';
import PlantDetailSheet from '@/components/PlantDetailSheet.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { usePlants } from '@/queries/plants.js';

const STATUSES = ['alive', 'dead', 'removed'];
const LIMIT = 24;

export default function DonorTrees() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openPlant, setOpenPlant] = useState(null);
  const { data, isLoading } = usePlants({
    status: status || undefined,
    page,
    limit: LIMIT,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Your impact, one tree at a time"
        title="My trees"
        description="Every tree your donations funded. Tap a card to see its location, planting photo, and weekly maintenance updates."
      />

      <div className="bento-card p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" aria-hidden /> Filter
        </div>
        <div className="flex-1 sm:max-w-xs">
          <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {status && (
          <Button variant="ghost" onClick={() => { setStatus(''); setPage(1); }}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title="Your forest is just getting started"
          description="As soon as volunteers plant the first tree your donation funded, you'll see it here with photos and GPS proof."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((p) => (
              <PlantCard key={p.id ?? p._id} plant={p} onClick={() => setOpenPlant(p)} />
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <PlantDetailSheet plant={openPlant} onClose={() => setOpenPlant(null)} />
    </>
  );
}
