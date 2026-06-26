import {
  Camera,
  Download,
  ExternalLink,
  Eye,
  Leaf,
  MapPin,
  QrCode,
  Ruler,
  Sprout,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { useMaintenance } from '@/queries/maintenance.js';
import { formatDate, formatDbh, formatGeo, formatHeight, formatRelative } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const PLANT_STATUS = {
  alive: 'bg-[#0B5000]/10 text-[#0B5000]',
  dead: 'bg-red-100 text-red-700',
  removed: 'bg-[#E2E8F0] text-[#1E1E1E]',
};
const HEALTH = {
  healthy: 'bg-[#0B5000]/10 text-[#0B5000]',
  at_risk: 'bg-amber-100 text-amber-700',
  diseased: 'bg-red-100 text-red-700',
  dead: 'bg-red-100 text-red-700',
};

function humanize(s) {
  return s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}
function Pill({ value, palette }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-medium',
        palette[value] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
      )}
    >
      {humanize(value)}
    </span>
  );
}

function ageFromPlantedAt(plantedAt) {
  if (!plantedAt) return '—';
  const days = Math.floor((Date.now() - new Date(plantedAt).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  return `${(days / 365.25).toFixed(1)} years`;
}

function DetailCard({ icon: Icon, label, children }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] p-3.5">
      <div className="flex items-center gap-1.5 text-xs text-[#1E1E1E]/50">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 text-sm text-[#001F00]">{children}</div>
    </div>
  );
}

// Sponsor's per-tree detail: photo, info, GPS/map, QR, and the tree's own
// weekly maintenance history — all in the new theme.
export default function SponsorTreeDetail({ plant, onClose }) {
  const open = !!plant;
  const id = plant?.id ?? plant?._id;
  const { data, isLoading } = useMaintenance({ plant: id, limit: 50, enabled: open });
  const logs = data?.items ?? [];

  if (!plant) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-xl" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            {plant.name ?? plant.species ?? 'Tree'}
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">
            Planted {formatDate(plant.plantedAt)}
            {plant.plantedBy?.name && <> by {plant.plantedBy.name}</>}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          {plant.plantingPhoto?.url && (
            <div className="overflow-hidden rounded-[10px] border border-[#E2E8F0]">
              <img
                src={plant.plantingPhoto.url}
                alt="Planting"
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Pill value={plant.status} palette={PLANT_STATUS} />
            {plant.site?.name && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2E8F0] px-3 py-1 text-xs text-[#1E1E1E]">
                <MapPin className="h-3 w-3" aria-hidden /> {plant.site.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DetailCard icon={MapPin} label="GPS">
              <span className="font-mono text-xs">{formatGeo(plant.geo)}</span>
              {plant.geo && (
                <a
                  href={`https://maps.google.com/?q=${plant.geo.lat},${plant.geo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 text-xs text-[#0B5000] hover:underline"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </DetailCard>
            <DetailCard icon={Leaf} label="Species">
              {plant.species ?? 'Unspecified'}
            </DetailCard>
            <DetailCard icon={Sprout} label="Age">
              {ageFromPlantedAt(plant.plantedAt)}
            </DetailCard>
            {plant.heightCm != null && (
              <DetailCard icon={Ruler} label="Height">
                {formatHeight(plant.heightCm)}
              </DetailCard>
            )}
            {plant.growthStage && (
              <DetailCard icon={Leaf} label="Growth stage">
                <span className="capitalize">{plant.growthStage}</span>
              </DetailCard>
            )}
            {plant.dryBiomassKg != null && (
              <DetailCard icon={Leaf} label="Dry biomass">
                {plant.dryBiomassKg} kg
              </DetailCard>
            )}
          </div>

          {plant.notes && (
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-4 text-sm text-[#001F00]">
              {plant.notes}
            </div>
          )}

          {/* QR */}
          {id && (
            <section className="rounded-[10px] border border-[#E2E8F0] p-5">
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <div className="shrink-0 rounded-[10px] border border-[#E2E8F0] bg-white p-2">
                  <img
                    src={`/api/plants/${id}/qr.png?size=400`}
                    alt="Tree QR code"
                    width={120}
                    height={120}
                    className="block h-28 w-28"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-[#0B5000]">
                    <QrCode className="h-3 w-3" aria-hidden /> Tree QR
                  </div>
                  <p className="text-sm leading-relaxed text-[#1E1E1E]/60">
                    Scan it to see the planting photo, GPS, and weekly care — no app or login.
                  </p>
                  {(plant.scanCount ?? 0) > 0 && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B5000]/10 px-2.5 py-1 text-xs text-[#0B5000]">
                      <Eye className="h-3 w-3" aria-hidden /> Viewed {plant.scanCount}{' '}
                      {plant.scanCount === 1 ? 'time' : 'times'}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={`/api/plants/${id}/qr.png?size=1024`}
                      download={`tree-${plant.publicCode ?? id}.png`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#001F00] px-4 py-2 text-sm text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                    {plant.publicCode && (
                      <a
                        href={`/tree/${plant.publicCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-[#0B5000] hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" /> Preview page
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Maintenance */}
          <section>
            <h3 className="text-sm font-medium uppercase tracking-widest text-[#1E1E1E]/50">
              Maintenance history
            </h3>
            {isLoading ? (
              <p className="mt-3 text-sm text-[#1E1E1E]/50">Loading logs…</p>
            ) : logs.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-dashed border-[#E2E8F0] p-6 text-center text-sm text-[#1E1E1E]/50">
                No watering logs yet for this tree.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {logs.map((log) => (
                  <li
                    key={log.id ?? log._id}
                    className="flex flex-col overflow-hidden rounded-[10px] border border-[#E2E8F0] sm:flex-row"
                  >
                    {log.photo?.url && (
                      <img
                        src={log.photo.url}
                        alt="Maintenance"
                        className="aspect-video w-full object-cover sm:aspect-square sm:w-40"
                      />
                    )}
                    <div className="flex-1 space-y-1.5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Camera className="h-4 w-4 text-[#0B5000]" aria-hidden />
                        <span className="text-sm font-medium text-[#001F00]">
                          Week of {formatDate(log.weekOf)}
                        </span>
                        <Pill value={log.healthStatus} palette={HEALTH} />
                      </div>
                      <div className="text-xs text-[#1E1E1E]/50">
                        Logged {formatRelative(log.createdAt)}
                        {log.volunteer?.name && <> by {log.volunteer.name}</>}
                      </div>
                      {(log.heightCm != null || log.dbhCm != null) && (
                        <div className="flex flex-wrap gap-2 pt-0.5 text-xs">
                          {log.heightCm != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0B5000]/10 px-2 py-0.5 font-medium text-[#0B5000]">
                              <Ruler className="h-3 w-3" aria-hidden /> {formatHeight(log.heightCm)}
                            </span>
                          )}
                          {log.dbhCm != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E2E8F0] px-2 py-0.5 font-medium text-[#1E1E1E]">
                              ⌀ {formatDbh(log.dbhCm)}
                            </span>
                          )}
                        </div>
                      )}
                      {log.note && <p className="mt-1 text-sm text-[#001F00]">{log.note}</p>}
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
