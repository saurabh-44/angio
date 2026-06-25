import { useState } from 'react';
import { Download, Filter, Leaf } from 'lucide-react';
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
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const STATUSES = ['alive', 'dead', 'removed'];
const LIMIT = 24;

function buildPlantExportQuery({ site, status }) {
  const sp = new URLSearchParams();
  if (site) sp.set('site', site);
  if (status) sp.set('status', status);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

const TRIGGER =
  'h-auto w-full max-w-[240px] rounded-[10px] border-[#E2E8F0] px-4 py-3 text-base text-[#1E1E1E] focus:ring-0 focus:ring-offset-0';

// Plants hub — every planted tree, with its location/map, QR, and weekly
// maintenance folded into each tree's detail drawer (Map + Maintenance panels
// consolidated here, mirroring the sponsor "My Trees" hub).
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
    <div style={{ fontFamily: BODY_FONT }}>
      <div>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Plants
        </h1>
        <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
          Every tree volunteers have planted. Tap a card for its location map, planting photo, QR,
          and weekly maintenance.
        </p>
      </div>

      {/* Filters + export */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-[#1E1E1E]/60">
          <Filter className="h-4 w-4" aria-hidden /> Filters
        </span>
        <Select
          value={site || 'all'}
          onValueChange={(v) => {
            setSite(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className={TRIGGER}>
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className={TRIGGER}>
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <a
          href={`/api/excel/export/plants.xlsx${buildPlantExportQuery({ site, status })}`}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[#001F00] px-5 py-3 text-sm font-medium text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white"
        >
          <Download className="h-4 w-4" aria-hidden /> Export to Excel
        </a>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[10px]" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load plants"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Leaf}
            title={hasFilter ? 'No plants match' : 'No plants recorded yet'}
            description={
              hasFilter
                ? 'Try removing some filters.'
                : 'Plants appear here when volunteers upload a planting photo from the field.'
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <PlantCard key={p.id ?? p._id} plant={p} onClick={() => setOpenPlant(p)} />
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <PlantDetailSheet plant={openPlant} onClose={() => setOpenPlant(null)} />
    </div>
  );
}
