import { Camera, Download, Eye, ExternalLink, Leaf, MapPin, QrCode, Ruler, Sprout, Stethoscope } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import PlantStatusBadge from './PlantStatusBadge.jsx';
import HealthBadge from './HealthBadge.jsx';
import { useMaintenance } from '@/queries/maintenance.js';
import { formatDate, formatDbh, formatGeo, formatHeight, formatRelative } from '@/lib/format.js';

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
          <SheetTitle>{plant.name ?? plant.species ?? 'Tree'}</SheetTitle>
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
            <DetailRow icon={Sprout} label="Age">
              {ageFromPlantedAt(plant.plantedAt) ?? '—'}
            </DetailRow>
            {plant.heightCm != null && (
              <DetailRow icon={Ruler} label="Height">
                {formatHeight(plant.heightCm)}
              </DetailRow>
            )}
            {plant.growthStage && (
              <DetailRow icon={Leaf} label="Growth stage">
                <span className="capitalize">{plant.growthStage}</span>
              </DetailRow>
            )}
            {plant.dryBiomassKg != null && (
              <DetailRow icon={Leaf} label="Dry biomass">
                {plant.dryBiomassKg} kg
              </DetailRow>
            )}
          </div>

          {plant.notes && (
            <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
              {plant.notes}
            </div>
          )}

          <QrSection
            plantId={id}
            publicCode={plant.publicCode}
            scanCount={plant.scanCount}
            lastScannedAt={plant.lastScannedAt}
          />

          <LatestMeasurements logs={logs} />

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <Camera className="h-4 w-4 text-primary" aria-hidden />
                        <span className="font-medium text-sm text-foreground">
                          Week of {formatDate(log.weekOf)}
                        </span>
                        <HealthBadge status={log.healthStatus} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Logged {formatRelative(log.createdAt)}
                        {log.volunteer?.name && <> by {log.volunteer.name}</>}
                      </div>
                      {(log.heightCm != null || log.dbhCm != null) && (
                        <div className="flex flex-wrap gap-2 text-xs pt-0.5">
                          {log.heightCm != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 border border-leaf-100 px-2 py-0.5 text-leaf-700 font-medium">
                              <Ruler className="h-3 w-3" aria-hidden />
                              {formatHeight(log.heightCm)}
                            </span>
                          )}
                          {log.dbhCm != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border/60 px-2 py-0.5 text-secondary-foreground font-medium">
                              ⌀ {formatDbh(log.dbhCm)}
                            </span>
                          )}
                        </div>
                      )}
                      {log.note && <p className="text-sm text-foreground mt-1">{log.note}</p>}
                      {log.diseaseNotes && (
                        <p className="text-xs text-destructive mt-1 inline-flex items-start gap-1">
                          <Stethoscope className="h-3 w-3 mt-0.5 shrink-0" aria-hidden />
                          {log.diseaseNotes}
                        </p>
                      )}
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

// Pulls the most recent recorded measurement out of the maintenance
// history. We scan log-by-log because the volunteer may have skipped a
// reading on the last visit while recording one the week before.
function LatestMeasurements({ logs }) {
  if (!logs || logs.length === 0) return null;
  const latest = {
    height: logs.find((l) => l.heightCm != null),
    dbh: logs.find((l) => l.dbhCm != null),
    health: logs.find((l) => l.healthStatus),
  };
  if (!latest.height && !latest.dbh && !latest.health) return null;
  return (
    <section className="bento-card surface-biophilic p-4 sm:p-5">
      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-medium mb-3">
        <Ruler className="h-3 w-3" aria-hidden /> Latest measurements
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MetricCell
          label="Height"
          value={latest.height ? formatHeight(latest.height.heightCm) : '—'}
          when={latest.height?.weekOf}
        />
        <MetricCell
          label="Trunk (DBH)"
          value={latest.dbh ? formatDbh(latest.dbh.dbhCm) : '—'}
          when={latest.dbh?.weekOf}
        />
        <MetricCell
          label="Health"
          value={latest.health?.healthStatus ? null : '—'}
          badge={<HealthBadge status={latest.health?.healthStatus} />}
          when={latest.health?.weekOf}
        />
      </div>
    </section>
  );
}

function MetricCell({ label, value, badge, when }) {
  return (
    <div className="rounded-xl bg-card/60 backdrop-blur p-3 border border-border/60">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-heading text-base font-bold text-foreground">
        {value ?? badge}
      </div>
      {when && (
        <div className="mt-1 text-[10px] text-muted-foreground/80">
          as of {formatDate(when)}
        </div>
      )}
    </div>
  );
}

// "Age of the plant" — derived client-side from plantedAt (the server's
// list/detail reads are .lean(), which skip the model's ageDays virtual).
function ageFromPlantedAt(plantedAt) {
  if (!plantedAt) return null;
  const ms = Date.now() - new Date(plantedAt).getTime();
  const days = Math.floor(ms / 86400000);
  if (days <= 0) return 'Today';
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  return `${(days / 365.25).toFixed(1)} years`;
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

// The tree's QR sticker. The PNG is rendered inline (cookies travel
// with the <img> tag because /api/* is same-origin via the Vite proxy)
// and the buttons let users save it for printing or open the public
// verification page in a new tab.
function QrSection({ plantId, publicCode, scanCount, lastScannedAt }) {
  if (!plantId) return null;
  const pngUrl = `/api/plants/${plantId}/qr.png?size=400`;
  const downloadUrl = `/api/plants/${plantId}/qr.png?size=1024`;
  const publicUrl = publicCode ? `/tree/${publicCode}` : null;
  const hasScans = (scanCount ?? 0) > 0;
  return (
    <section className="bento-card p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-white p-2 shrink-0 shadow-soft border border-border/60">
          <img
            src={pngUrl}
            alt="QR code for this tree"
            width={120}
            height={120}
            className="block h-30 w-30 sm:h-32 sm:w-32"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-medium">
            <QrCode className="h-3 w-3" aria-hidden /> Tree QR
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Print this and stick it on the tree. Anyone who scans it sees the planting photo,
            GPS, and weekly maintenance — no app or login required.
          </p>
          {hasScans && (
            <div className="inline-flex items-center gap-1.5 text-xs text-leaf-700 bg-leaf-50 border border-leaf-100 rounded-full px-2.5 py-1">
              <Eye className="h-3 w-3" aria-hidden />
              Viewed <span className="font-semibold">{scanCount}</span>{' '}
              {scanCount === 1 ? 'time' : 'times'}
              {lastScannedAt && <> · last {formatRelative(lastScannedAt)}</>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <a href={downloadUrl} download={`tree-${publicCode ?? plantId}.png`}>
                <Download className="h-4 w-4" /> Download
              </a>
            </Button>
            {publicUrl && (
              <Button asChild variant="ghost" size="sm">
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Preview page
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
