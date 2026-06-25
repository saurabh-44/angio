import { Leaf, MapPin } from 'lucide-react';
import { formatDate, formatGeo } from '@/lib/format.js';
import { cn } from '@/lib/utils';

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

// Compact plant tile — used in grid views (admin/site-owner Plants, the map
// popup, volunteer history). Click handler passed via `onClick`.
export default function PlantCard({ plant, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group overflow-hidden rounded-[10px] border border-[#E2E8F0] text-left transition-colors hover:border-[#001F00]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#F6FAF6]">
        {plant.plantingPhoto?.url ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={plant.plantingPhoto.url}
            alt={`Planting photo of ${plant.species ?? 'a tree'}`}
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
              {plant.name ?? plant.species ?? 'Unspecified tree'}
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
