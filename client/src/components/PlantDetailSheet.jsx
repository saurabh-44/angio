import { Camera, ExternalLink, Leaf, MapPin } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import PlantStatusBadge from './PlantStatusBadge.jsx';
import { useMaintenance } from '@/queries/maintenance.js';
import { formatDate, formatGeo, formatRelative } from '@/lib/format.js';

// Shared detail panel for a plant. Used by admin, site_owner, donor,
// and volunteer views — the data they see is filtered server-side.
export default function PlantDetailSheet({ plant, onClose }) {
  const open = !!plant;
  const id = plant?.id ?? plant?._id;
  const { data, isLoading } = useMaintenance({ plant: id, limit: 50, enabled: open });
  const logs = data?.items ?? [];

  if (!plant) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{plant.species ?? 'Tree'}</SheetTitle>
          <SheetDescription>
            Planted {formatDate(plant.plantedAt)}
            {plant.plantedBy?.name && <> by {plant.plantedBy.name}</>}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto pr-1 space-y-5">
          {plant.plantingPhoto?.url && (
            <div className="rounded-2xl overflow-hidden border border-border/60">
              <img
                src={plant.plantingPhoto.url}
                alt={`Planting photo of ${plant.species ?? 'tree'}`}
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <PlantStatusBadge status={plant.status} />
            <Badge variant="muted">{plant.site?.name ?? 'Site'}</Badge>
            {plant.allocation?.targetPlants && (
              <Badge variant="outline">Allocation: {plant.allocation.targetPlants} target</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon={MapPin} label="GPS">
              <span className="font-mono text-xs">{formatGeo(plant.geo)}</span>
              {plant.geo && (
                <a
                  href={`https://maps.google.com/?q=${plant.geo.lat},${plant.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </DetailRow>
            <DetailRow icon={Leaf} label="Species">
              {plant.species ?? 'Unspecified'}
            </DetailRow>
          </div>

          {plant.notes && (
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
              {plant.notes}
            </div>
          )}

          <section>
            <h3 className="font-heading text-sm font-semibold text-foreground mb-2">
              Maintenance history
            </h3>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading logs…</div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                No watering logs yet for this tree.
              </div>
            ) : (
              <ul className="space-y-3">
                {logs.map((log) => (
                  <li
                    key={log.id ?? log._id}
                    className="bento-card overflow-hidden flex sm:flex-row flex-col"
                  >
                    {log.photo?.url && (
                      <img
                        src={log.photo.url}
                        alt="Maintenance photo"
                        className="sm:w-40 w-full aspect-video sm:aspect-square object-cover"
                      />
                    )}
                    <div className="p-4 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-primary" aria-hidden />
                        <span className="font-medium text-sm text-foreground">
                          Week of {formatDate(log.weekOf)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Logged {formatRelative(log.createdAt)}
                        {log.volunteer?.name && <> by {log.volunteer.name}</>}
                      </div>
                      {log.note && <p className="text-sm text-foreground mt-1">{log.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="rounded-2xl border border-border/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}
