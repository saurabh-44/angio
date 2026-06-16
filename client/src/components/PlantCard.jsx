import { Leaf, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import PlantStatusBadge from './PlantStatusBadge.jsx';
import { formatDate, formatGeo } from '@/lib/format.js';
import { cn } from '@/lib/utils';

// Compact plant tile — used in grid views (plants list, donor "My Trees",
// volunteer history). Click handler passed via `onClick`.
export default function PlantCard({ plant, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group bento-card overflow-hidden text-left cursor-pointer transition-colors hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-secondary/40">
        {plant.plantingPhoto?.url ? (
          // The photo bytes live on Cloudinary; we just render the URL.
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img
            src={plant.plantingPhoto.url}
            alt={`Planting photo of ${plant.species ?? 'a tree'}`}
            loading="lazy"
            className="h-full w-full object-cover transition-opacity group-hover:opacity-95"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <Leaf className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-heading text-sm font-semibold text-foreground truncate">
            {plant.species ?? 'Unspecified tree'}
          </div>
          <PlantStatusBadge status={plant.status} />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3" aria-hidden />
          <span className="truncate">{plant.site?.name ?? formatGeo(plant.geo)}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Badge variant="muted">Planted {formatDate(plant.plantedAt)}</Badge>
        </div>
      </div>
    </button>
  );
}
