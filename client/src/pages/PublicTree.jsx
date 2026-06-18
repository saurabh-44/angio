import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CalendarDays,
  Droplets,
  ExternalLink,
  Leaf,
  MapPin,
  Ruler,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import { Button } from '@/components/ui/button.jsx';
import PlantStatusBadge from '@/components/PlantStatusBadge.jsx';
import HealthBadge from '@/components/HealthBadge.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { usePublicTree } from '@/queries/publicTree.js';
import { ApiError } from '@/lib/api.js';
import { formatDate, formatDbh, formatGeo, formatHeight, formatRelative } from '@/lib/format.js';

// Public no-auth verification page. Someone scans the QR sticker on a
// tree and lands here. The data is curated server-side — no donor or
// volunteer identity, just the proof a stranger needs.
export default function PublicTree() {
  const { code } = useParams();
  const { data, isLoading, error } = usePublicTree(code);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Spinner label="Loading tree" />
      </div>
    );
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          <EmptyState
            icon={Leaf}
            title={notFound ? 'No tree found for this code' : "Couldn't load this tree"}
            description={
              notFound
                ? 'The QR code might be from a tree that was removed, or the link is mistyped.'
                : 'Check your connection and try again in a moment.'
            }
            action={
              <Button asChild variant="outline">
                <Link to="/">Go to Environ</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  const tree = data?.tree;
  if (!tree) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <Hero tree={tree} />
        <Facts tree={tree} />
        <GrowthStrip logs={tree.maintenance} />
        <MaintenanceGallery logs={tree.maintenance} />
        <TrustFooter />
      </main>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-heading text-base font-bold tracking-tight">Environ</span>
        </Link>
        <Badge variant="success" className="hidden sm:inline-flex">
          <ShieldCheck className="h-3 w-3" aria-hidden /> Verified tree
        </Badge>
      </div>
    </header>
  );
}

function Hero({ tree }) {
  return (
    <section className="bento-card overflow-hidden surface-biophilic">
      {tree.plantingPhoto?.url ? (
        <img
          src={tree.plantingPhoto.url}
          alt={`Planting photo of ${tree.species ?? 'a tree'}`}
          className="w-full aspect-video sm:aspect-[2/1] object-cover"
        />
      ) : (
        <div className="w-full aspect-[2/1] grid place-items-center bg-secondary/40">
          <Leaf className="h-10 w-10 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="p-6 sm:p-8 space-y-3">
        <div className="text-xs uppercase tracking-widest text-primary font-medium">
          A verified tree
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
          {tree.name ?? tree.species ?? 'Unspecified tree'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <PlantStatusBadge status={tree.status} />
          {tree.species && tree.species !== tree.name && (
            <Badge variant="outline">{tree.species}</Badge>
          )}
          {tree.site?.name && <Badge variant="muted">{tree.site.name}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
          This tree is part of an Environ plantation. Every step is logged — when it was
          planted, where, and a fresh maintenance photo every week. The QR sticker proves it
          exists.
        </p>
      </div>
    </section>
  );
}

function Facts({ tree }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Fact icon={CalendarDays} label="Planted on">
        {formatDate(tree.plantedAt)}
      </Fact>
      <Fact icon={MapPin} label="GPS">
        <div className="font-mono text-xs">{formatGeo(tree.geo)}</div>
        {tree.geo && (
          <a
            href={`https://maps.google.com/?q=${tree.geo.lat},${tree.geo.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open in Maps <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </Fact>
      <Fact icon={Droplets} label="Watering checks">
        <span className="font-heading text-xl font-bold text-foreground">
          {tree.maintenance?.length ?? 0}
        </span>
        <span className="text-xs text-muted-foreground ml-1.5">recorded</span>
      </Fact>
    </section>
  );
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="bento-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </div>
  );
}

// Growth + health strip — only shows if there's at least one
// measurement to surface. Public-facing so a curious passer-by sees how
// the tree's doing without reading every log.
function GrowthStrip({ logs = [] }) {
  const latest = {
    height: logs.find((l) => l.heightCm != null),
    dbh: logs.find((l) => l.dbhCm != null),
    health: logs.find((l) => l.healthStatus),
  };
  if (!latest.height && !latest.dbh && !latest.health) return null;
  return (
    <section className="bento-card surface-biophilic p-6 sm:p-7">
      <div className="text-xs uppercase tracking-widest text-primary font-medium mb-3">
        How it's growing
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Height" value={latest.height ? formatHeight(latest.height.heightCm) : '—'} icon={Ruler} />
        <Stat label="Trunk (DBH)" value={latest.dbh ? formatDbh(latest.dbh.dbhCm) : '—'} />
        <div className="rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-3 sm:p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Health</div>
          <div className="mt-2">
            {latest.health?.healthStatus ? (
              <HealthBadge status={latest.health.healthStatus} className="text-[11px]" />
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-3 sm:p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" aria-hidden />}
        {label}
      </div>
      <div className="mt-2 font-heading text-lg sm:text-xl font-bold text-foreground tracking-tight">
        {value}
      </div>
    </div>
  );
}

function MaintenanceGallery({ logs = [] }) {
  if (logs.length === 0) {
    return (
      <section className="bento-card p-6 sm:p-8 text-center">
        <Droplets className="h-6 w-6 text-muted-foreground mx-auto" aria-hidden />
        <h2 className="mt-3 font-heading text-base font-semibold">Maintenance is just getting started</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Volunteers add a fresh photo every week. Check back soon.
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-base font-semibold">Weekly maintenance</h2>
        <span className="text-xs text-muted-foreground">{logs.length} photo{logs.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {logs.map((log, i) => (
          <li key={i} className="bento-card overflow-hidden">
            {log.photo?.url ? (
              <img
                src={log.photo.url}
                alt={`Maintenance photo from week of ${formatDate(log.weekOf)}`}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square grid place-items-center bg-secondary/40">
                <Camera className="h-6 w-6 text-muted-foreground" aria-hidden />
              </div>
            )}
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">
                  Week of {formatDate(log.weekOf)}
                </div>
                <HealthBadge status={log.healthStatus} />
              </div>
              <div className="text-xs text-muted-foreground">
                {formatRelative(log.createdAt)}
              </div>
              {(log.heightCm != null || log.dbhCm != null) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.heightCm != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 border border-leaf-100 px-1.5 py-0.5 text-[10px] text-leaf-700 font-medium">
                      <Ruler className="h-2.5 w-2.5" aria-hidden /> {formatHeight(log.heightCm)}
                    </span>
                  )}
                  {log.dbhCm != null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border/60 px-1.5 py-0.5 text-[10px] text-secondary-foreground font-medium">
                      ⌀ {formatDbh(log.dbhCm)}
                    </span>
                  )}
                </div>
              )}
              {log.note && (
                <p className="text-xs text-foreground/80 line-clamp-2">{log.note}</p>
              )}
              {log.diseaseNotes && (
                <p className="text-[11px] text-destructive line-clamp-2 inline-flex items-start gap-1">
                  <Stethoscope className="h-2.5 w-2.5 mt-0.5 shrink-0" aria-hidden />
                  {log.diseaseNotes}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TrustFooter() {
  return (
    <section className="border-t border-border/60 pt-8">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <h3 className="font-heading text-base font-semibold">Want to plant trees like this one?</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-prose">
            Sign up as a sponsor and you'll get the same GPS + photo + weekly maintenance proof for
            every tree your donation funds.
          </p>
        </div>
        <Button asChild>
          <Link to="/">
            Visit Environ <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <p className="mt-8 text-xs text-muted-foreground/70 text-center">
        &copy; {new Date().getFullYear()} Environ · QR-verified tree record
      </p>
    </section>
  );
}
