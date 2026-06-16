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
import { useSites } from '@/queries/sites.js';

const STATUSES = ['alive', 'dead', 'removed'];
const LIMIT = 24;

export default function PlantsPage() {
  const [site, setSite] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openPlant, setOpenPlant] = useState(null);

  const { data, isLoading, isError, refetch } = usePlants({
    site: site || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const { data: sitesData } = useSites({ limit: 200 });
  const sites = sitesData?.items ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = !!site || !!status;

  return (
    <>
      <PageHeader
        eyebrow="Verified planting"
        title="Plants"
        description="Every tree volunteers have planted, with GPS and photo evidence."
      />

      <div className="bento-card p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" aria-hidden /> Filters
        </div>
        <div className="flex-1 grid sm:grid-cols-2 gap-3">
          <Select value={site || 'all'} onValueChange={(v) => { setSite(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="All sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        {hasFilter && (
          <Button
            variant="ghost"
            onClick={() => { setSite(''); setStatus(''); setPage(1); }}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load plants"
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Leaf}
          title={hasFilter ? 'No plants match' : 'No plants recorded yet'}
          description={
            hasFilter
              ? 'Try removing some filters.'
              : 'Plants appear here when volunteers upload a planting photo from the field.'
          }
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
