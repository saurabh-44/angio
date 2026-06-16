import { useState } from 'react';
import { Camera, Droplets, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { useMaintenance } from '@/queries/maintenance.js';
import { useSites } from '@/queries/sites.js';
import { formatDate, formatRelative } from '@/lib/format.js';

const LIMIT = 12;

export default function MaintenancePage() {
  const [site, setSite] = useState('');
  const [page, setPage] = useState(1);
  const { data: sitesData } = useSites({ limit: 200 });
  const sites = sitesData?.items ?? [];
  const { data, isLoading, isError, refetch } = useMaintenance({
    site: site || undefined,
    page,
    limit: LIMIT,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Weekly proof"
        title="Maintenance"
        description="Every weekly watering check, with photo and the volunteer who recorded it."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 max-w-md">
        <Select value={site || 'all'} onValueChange={(v) => { setSite(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="All sites" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {site && (
          <Button variant="ghost" onClick={() => { setSite(''); setPage(1); }}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="Couldn't load logs" action={<Button onClick={() => refetch()}>Retry</Button>} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Droplets}
          title="No watering logs yet"
          description="Site owners and volunteers upload a fresh photo each week per tree."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((log) => <LogCard key={log.id ?? log._id} log={log} />)}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}
    </>
  );
}

function LogCard({ log }) {
  return (
    <article className="bento-card overflow-hidden">
      <div className="aspect-video bg-secondary/40 overflow-hidden">
        {log.photo?.url ? (
          <img src={log.photo.url} alt="Watering check" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <Camera className="h-6 w-6" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="success">Week of {formatDate(log.weekOf)}</Badge>
          <span className="text-xs text-muted-foreground">{formatRelative(log.createdAt)}</span>
        </div>
        <div className="font-medium text-sm text-foreground">
          {log.plant?.species ?? 'Tree'} · {log.site?.name ?? '—'}
        </div>
        {log.volunteer?.name && (
          <div className="text-xs text-muted-foreground">By {log.volunteer.name}</div>
        )}
        {log.note && <p className="text-sm text-foreground line-clamp-3">{log.note}</p>}
      </div>
    </article>
  );
}
