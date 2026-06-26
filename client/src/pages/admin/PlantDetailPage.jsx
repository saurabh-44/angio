import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera,
  ChevronLeft,
  Download,
  ExternalLink,
  Eye,
  Leaf,
  MapPin,
  QrCode,
  Ruler,
  Sprout,
  Stethoscope,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import PlantLocationMap from '@/components/PlantLocationMap.jsx';
import { usePlant } from '@/queries/plants.js';
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

// Full plant detail page (replaces the cramped side drawer): big planting
// photo, location map, facts, QR, and the full weekly-maintenance gallery.
export default function PlantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePlant(id);
  const plant = data?.plant;
  const { data: maintData, isLoading: maintLoading } = useMaintenance({ plant: id, limit: 100 });
  const logs = maintData?.items ?? [];

  if (isError) {
    return (
      <div className="mt-10" style={{ fontFamily: BODY_FONT }}>
        <EmptyState
          icon={Leaf}
          title="Couldn't load this tree"
          description="It may have been removed, or check your connection."
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[10px] border border-[#B4B4B4] text-[#1E1E1E] transition-colors hover:border-[#0B5000] hover:text-[#0B5000]"
          aria-label="Back to plants"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <>
              <h1 className="truncate text-2xl font-medium text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
                {plant?.name ?? plant?.species ?? 'Tree'}
              </h1>
              <p className="truncate text-base text-[#1E1E1E]/50">
                Planted {formatDate(plant?.plantedAt)}
                {plant?.plantedBy?.name && <> by {plant.plantedBy.name}</>}
              </p>
            </>
          )}
        </div>
      </div>

      {isLoading || !plant ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="aspect-video rounded-[10px]" />
          <Skeleton className="h-64 rounded-[10px]" />
        </div>
      ) : (
        <>
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
            {/* Left: photo + map */}
            <div className="space-y-6">
              {plant.plantingPhoto?.url && (
                <div className="overflow-hidden rounded-[10px] border border-[#E2E8F0]">
                  <img
                    src={plant.plantingPhoto.url}
                    alt="Planting"
                    className="aspect-video w-full object-cover"
                  />
                </div>
              )}
              {plant.geo?.lat != null && (
                <div className="space-y-2">
                  <PlantLocationMap geo={plant.geo} status={plant.status} />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[#1E1E1E]/60">{formatGeo(plant.geo)}</span>
                    <a
                      href={`https://maps.google.com/?q=${plant.geo.lat},${plant.geo.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-[#0B5000] hover:underline"
                    >
                      Open in Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right: facts + QR */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Pill value={plant.status} palette={PLANT_STATUS} />
                {plant.site?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2E8F0] px-3 py-1 text-xs text-[#1E1E1E]">
                    <MapPin className="h-3 w-3" aria-hidden /> {plant.site.name}
                  </span>
                )}
                {plant.allocation?.targetPlants && (
                  <span className="inline-flex rounded-full bg-[#0B5000]/10 px-3 py-1 text-xs font-medium text-[#0B5000]">
                    Allocation: {plant.allocation.targetPlants} target
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DetailCard icon={Leaf} label="Species">{plant.species ?? 'Unspecified'}</DetailCard>
                <DetailCard icon={Sprout} label="Age">{ageFromPlantedAt(plant.plantedAt)}</DetailCard>
                {plant.heightCm != null && (
                  <DetailCard icon={Ruler} label="Height">{formatHeight(plant.heightCm)}</DetailCard>
                )}
                {plant.growthStage && (
                  <DetailCard icon={Leaf} label="Growth stage">
                    <span className="capitalize">{plant.growthStage}</span>
                  </DetailCard>
                )}
                {plant.dryBiomassKg != null && (
                  <DetailCard icon={Leaf} label="Dry biomass">{plant.dryBiomassKg} kg</DetailCard>
                )}
              </div>

              {plant.notes && (
                <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-4 text-sm text-[#001F00]">
                  {plant.notes}
                </div>
              )}

              <QrSection
                plantId={id}
                publicCode={plant.publicCode}
                scanCount={plant.scanCount}
                lastScannedAt={plant.lastScannedAt}
              />
            </div>
          </div>

          <LatestMeasurements logs={logs} />

          {/* Maintenance gallery */}
          <section className="mt-8">
            <h2 className="text-xl font-medium text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
              Maintenance history
            </h2>
            <p className="mt-1 text-sm text-[#1E1E1E]/50">
              Every weekly watering check, with photo and the volunteer who recorded it.
            </p>
            {maintLoading ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-[10px]" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="mt-5 rounded-[10px] border border-dashed border-[#E2E8F0] p-10 text-center text-sm text-[#1E1E1E]/50">
                No watering logs yet for this tree.
              </p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {logs.map((log) => (
                  <MaintenanceCard key={log.id ?? log._id} log={log} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MaintenanceCard({ log }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#E2E8F0]">
      {log.photo?.url ? (
        <img src={log.photo.url} alt="Maintenance" className="aspect-video w-full object-cover" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-[#F6FAF6] text-[#0B5000]/30">
          <Camera className="h-8 w-8" aria-hidden />
        </div>
      )}
      <div className="space-y-1.5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Camera className="h-4 w-4 text-[#0B5000]" aria-hidden />
          <span className="text-sm font-medium text-[#001F00]">Week of {formatDate(log.weekOf)}</span>
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
        {log.diseaseNotes && (
          <p className="mt-1 inline-flex items-start gap-1 text-xs text-destructive">
            <Stethoscope className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> {log.diseaseNotes}
          </p>
        )}
      </div>
    </div>
  );
}

function LatestMeasurements({ logs }) {
  if (!logs || logs.length === 0) return null;
  const latest = {
    height: logs.find((l) => l.heightCm != null),
    dbh: logs.find((l) => l.dbhCm != null),
    health: logs.find((l) => l.healthStatus),
  };
  if (!latest.height && !latest.dbh && !latest.health) return null;
  return (
    <section className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-5">
      <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-[#0B5000]">
        <Ruler className="h-3 w-3" aria-hidden /> Latest measurements
      </div>
      <div className="grid max-w-xl grid-cols-3 gap-3">
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
          badge={<Pill value={latest.health?.healthStatus} palette={HEALTH} />}
          when={latest.health?.weekOf}
        />
      </div>
    </section>
  );
}

function MetricCell({ label, value, badge, when }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-3">
      <div className="text-[10px] uppercase tracking-widest text-[#1E1E1E]/50">{label}</div>
      <div className="mt-1.5 text-base font-bold text-[#001F00]">{value ?? badge}</div>
      {when && <div className="mt-1 text-[10px] text-[#1E1E1E]/45">as of {formatDate(when)}</div>}
    </div>
  );
}

function QrSection({ plantId, publicCode, scanCount, lastScannedAt }) {
  if (!plantId) return null;
  return (
    <section className="rounded-[10px] border border-[#E2E8F0] p-5">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <div className="shrink-0 rounded-[10px] border border-[#E2E8F0] bg-white p-2">
          <img
            src={`/api/plants/${plantId}/qr.png?size=400`}
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
            Print it and stick it on the tree. Anyone who scans sees the planting photo, GPS, and
            weekly care — no app or login.
          </p>
          {(scanCount ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B5000]/10 px-2.5 py-1 text-xs text-[#0B5000]">
              <Eye className="h-3 w-3" aria-hidden /> Viewed {scanCount}{' '}
              {scanCount === 1 ? 'time' : 'times'}
              {lastScannedAt && <> · last {formatRelative(lastScannedAt)}</>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={`/api/plants/${plantId}/qr.png?size=1024`}
              download={`tree-${publicCode ?? plantId}.png`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#001F00] px-4 py-2 text-sm text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            {publicCode && (
              <a
                href={`/tree/${publicCode}`}
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
  );
}
