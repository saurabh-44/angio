import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Download, Filter, Leaf, Loader2, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import PlantCard from '@/components/PlantCard.jsx';
import DownloadLink from '@/components/DownloadLink.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { usePlants, useMovePlants } from '@/queries/plants.js';
import { useSites } from '@/queries/sites.js';
import { useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

// A tree can be re-homed to another site only while it's unsponsored —
// once linked to a sponsor's order it's pinned to that order's site.
const isMovable = (p) => !p.donor && !p.allocation;

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
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'ngo_admin';
  // Volunteers reach this page as their own "My Plants" list. They can't list
  // sites (GET /api/sites is admin/owner only) or export (403), so both are
  // hidden for them; their plant list is already scoped to their plantings.
  const isVolunteer = role === 'volunteer';
  const { success, error: toastError } = useToast();
  const [site, setSite] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Bulk "move to site" selection (admin only). Selection is cleared
  // whenever the filter or page changes so ids never linger off-screen.
  const move = useMovePlants();
  const [selected, setSelected] = useState(() => new Set());
  const [moveTarget, setMoveTarget] = useState('');

  const { data, isLoading, isError, refetch } = usePlants({
    site: site || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const { data: sitesData } = useSites({ limit: 200, enabled: !isVolunteer });
  const sites = sitesData?.items ?? [];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = !!site || !!status;
  const movableOnPage = isAdmin && items.some(isMovable);

  function clearSelection() {
    setSelected(new Set());
    setMoveTarget('');
  }
  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function doMove() {
    const target = sites.find((s) => (s.id ?? s._id) === moveTarget);
    try {
      const res = await move.mutateAsync({ plantIds: [...selected], site: moveTarget });
      success('Trees moved', `${res.moved} tree${res.moved === 1 ? '' : 's'} moved to ${target?.name ?? 'the site'}.`);
      clearSelection();
    } catch (err) {
      toastError("Couldn't move trees", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <div
      style={{ fontFamily: BODY_FONT }}
      className={cn(isAdmin && selected.size > 0 && 'pb-28')}
    >
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          {isVolunteer ? 'My Plants' : 'Plants'}
        </h1>
        <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
          {isVolunteer
            ? 'Every tree you have planted. Tap a card for its location map, planting photo, QR, and weekly maintenance.'
            : 'Every tree volunteers have planted. Tap a card for its location map, planting photo, QR, and weekly maintenance.'}
        </p>
      </PageHeading>

      {/* Filters + export */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-[#1E1E1E]/60">
          <Filter className="h-4 w-4" aria-hidden /> Filters
        </span>
        {!isVolunteer && (
          <Select
            value={site || 'all'}
            onValueChange={(v) => {
              setSite(v === 'all' ? '' : v);
              setPage(1);
              clearSelection();
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
        )}
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
            clearSelection();
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
        {!isVolunteer && (
          <DownloadLink
            href={`/api/excel/export/plants.xlsx${buildPlantExportQuery({ site, status })}`}
            filename="plants.xlsx"
            className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[#001F00] px-5 py-3 text-sm font-medium text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden /> Export to Excel
          </DownloadLink>
        )}
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
                : isVolunteer
                  ? 'Trees you record from the field will appear here.'
                  : 'Plants appear here when volunteers upload a planting photo from the field.'
            }
          />
        </div>
      ) : (
        <>
          {movableOnPage && selected.size === 0 && (
            <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#1E1E1E]/50">
              <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
              Tick unsponsored trees to move them to another site.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => {
              const id = p.id ?? p._id;
              const selectable = isAdmin && isMovable(p);
              const checked = selected.has(id);
              return (
                <div key={id} className="relative">
                  {selectable && (
                    <label
                      className={cn(
                        'absolute left-3 top-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border bg-white/95 shadow-sm',
                        checked ? 'border-[#0B5000] ring-2 ring-[#0B5000]/30' : 'border-[#E2E8F0]',
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(id)}
                        className="h-4 w-4 accent-[#0B5000]"
                        aria-label="Select tree to move"
                      />
                    </label>
                  )}
                  <PlantCard plant={p} onClick={() => navigate(`${id}`)} />
                </div>
              );
            })}
          </div>
          <Pagination
            page={page}
            limit={LIMIT}
            total={total}
            onChange={(p) => {
              setPage(p);
              clearSelection();
            }}
          />
        </>
      )}

      {/* Bulk move action bar — appears while trees are selected (admin only).
          Uses `fixed` (not `sticky`) so it stays put when the Move-to-site
          dropdown opens and Radix locks page scrolling. */}
      {isAdmin && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.5rem))] z-40 px-4">
          <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.14)]">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#001F00]">
              <ArrowRightLeft className="h-4 w-4 text-[#0B5000]" aria-hidden />
              {selected.size} selected
            </span>
            <div className="flex flex-1 items-center gap-2">
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger className="h-auto flex-1 rounded-[10px] border-[#E2E8F0] px-4 py-2.5 text-sm focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Move to site…" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" onClick={doMove} disabled={!moveTarget || move.isPending}>
                {move.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Move
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={clearSelection}
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
