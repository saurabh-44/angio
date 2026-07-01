import { useState } from 'react';
import { Download, Filter, Leaf, MapPin } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import SponsorTreeDetail from '@/components/SponsorTreeDetail.jsx';
import DownloadLink from '@/components/DownloadLink.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { usePlants } from '@/queries/plants.js';
import { formatDate, formatGeo } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

const STATUSES = ['alive', 'dead', 'removed'];
const LIMIT = 24;

const PLANT_STATUS = {
  alive: 'bg-[#0B5000]/10 text-[#0B5000]',
  dead: 'bg-red-100 text-red-700',
  removed: 'bg-[#E2E8F0] text-[#1E1E1E]',
};

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize',
        PLANT_STATUS[status] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
      )}
    >
      {status}
    </span>
  );
}

function TreeCard({ plant, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-[10px] border border-[#E2E8F0] text-left transition-colors hover:border-[#001F00]/50"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#F6FAF6]">
        {plant.plantingPhoto?.url ? (
          <img
            src={plant.plantingPhoto.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#0B5000]/40">
            <Leaf className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-base font-medium text-[#001F00]">
              {plant.name ?? plant.species ?? 'Tree'}
            </div>
            {plant.species && plant.species !== plant.name && (
              <div className="truncate text-sm text-[#1E1E1E]/50">{plant.species}</div>
            )}
          </div>
          <StatusPill status={plant.status} />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-[#1E1E1E]/60">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{plant.site?.name ?? formatGeo(plant.geo)}</span>
        </div>
        <div className="pt-1">
          <span className="inline-flex rounded-full bg-[#E2E8F0] px-3 py-1 text-xs text-[#1E1E1E]">
            Planted {formatDate(plant.plantedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

// Sponsor "My Trees" hub — lists planted trees; tapping one opens its full
// detail (info + GPS/map + QR + weekly maintenance) in a drawer.
export default function SponsorTrees() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [openPlant, setOpenPlant] = useState(null);
  const { data, isLoading } = usePlants({ status: status || undefined, page, limit: LIMIT });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          My Trees
        </h1>
        <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
          Every tree your donations funded. Tap a card for its location, planting photo, weekly
          maintenance, and QR.
        </p>
      </PageHeading>

      {/* Filter + export */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-[#1E1E1E]/60">
          <Filter className="h-4 w-4" aria-hidden /> Filter
        </span>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-auto w-full max-w-[260px] rounded-[10px] border-[#E2E8F0] px-4 py-3 text-base text-[#1E1E1E] focus:ring-0 focus:ring-offset-0">
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
        <DownloadLink
          href="/api/excel/export/my-trees.xlsx"
          filename="my-trees.xlsx"
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[#001F00] px-5 py-3 text-sm font-medium text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden /> Export to Excel
        </DownloadLink>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] rounded-[10px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Leaf}
            title="Your forest is just getting started"
            description="As soon as volunteers plant the first tree your donation funded, you'll see it here with photos and GPS proof."
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => (
              <TreeCard key={p.id ?? p._id} plant={p} onClick={() => setOpenPlant(p)} />
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <SponsorTreeDetail plant={openPlant} onClose={() => setOpenPlant(null)} />
    </div>
  );
}
