import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Cloud,
  Download,
  Droplets,
  FileText,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  TreePine,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import PlantCard from '@/components/PlantCard.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { usePlants } from '@/queries/plants.js';
import { useMaintenance } from '@/queries/maintenance.js';
import { useDonations } from '@/queries/donations.js';
import { useDonorCo2 } from '@/queries/co2.js';
import { formatAmount, formatRelative } from '@/lib/format.js';

function dash(v) {
  return v == null ? '—' : String(v);
}

export default function SponsorHome() {
  const { user } = useAuth();
  const plantsAll = usePlants({ limit: 6 });
  const plantsAlive = usePlants({ status: 'alive', limit: 1 });
  const logs = useMaintenance({ limit: 4 });
  const donations = useDonations({ limit: 1, status: 'paid' });
  const donationsForTotal = useDonations({ limit: 100, status: 'paid' });
  const co2 = useDonorCo2();
  const treesPlanted = plantsAll.data?.total ?? 0;

  const recentSites = new Set(
    (plantsAll.data?.items ?? [])
      .map((p) => p.site?.id ?? p.site?._id ?? p.site)
      .filter(Boolean),
  );
  const donatedTotal = (donationsForTotal.data?.items ?? []).reduce(
    (s, d) => s + (d.amount ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Your impact"
        title={`Thank you, ${user?.name?.split(' ')[0] ?? 'friend'}`}
        description="Every tree your donation funded, with planting and weekly maintenance proof."
        actions={
          <Button asChild variant="accent" size="lg">
            <Link to="/sponsor/sponsor">
              <Sparkles className="h-4 w-4" /> Sponsor more trees
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile
          className="lg:col-span-5"
          hero
          icon={Leaf}
          tone="leaf"
          value={dash(plantsAlive.data?.total)}
          label="Trees alive from your donations"
          sub={`${dash(plantsAll.data?.total)} planted total`}
        />
        <Co2StatTile className="lg:col-span-4" co2={co2.data?.summary} />
        <StatTile
          className="lg:col-span-3"
          icon={MapPin}
          tone="sky"
          value={recentSites.size > 0 ? `${recentSites.size}+` : '—'}
          label="Sites you've funded"
          sub={`${dash(logs.data?.total)} watering checks`}
        />

        <div className="lg:col-span-8 bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-base font-semibold">Recently planted</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest trees the team has put in the ground for you.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/sponsor/trees">View all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          {plantsAll.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
              ))}
            </div>
          ) : (plantsAll.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Volunteers haven't planted your trees yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(plantsAll.data?.items ?? []).slice(0, 3).map((p) => (
                <PlantCard key={p.id ?? p._id} plant={p} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <SponsorCallout
            hasGiven={(donations.data?.total ?? 0) > 0}
            firstName={user?.name?.split(' ')[0]}
          />
          <div className="bento-card surface-biophilic p-6 flex flex-col gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="font-heading text-base font-semibold">Verified weekly</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Volunteers upload geo-tagged photos each week. You see them as soon as they arrive.
            </p>
            <Button asChild className="w-full mt-2" variant="outline">
              <Link to="/sponsor/map">Open the map <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="bento-card p-6">
            <h3 className="font-heading text-base font-semibold mb-1">Total recorded</h3>
            <div className="font-heading text-3xl font-bold text-foreground tracking-tight">
              {formatAmount(donatedTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dash(donations.data?.total)} donation{donations.data?.total === 1 ? '' : 's'} logged
            </p>
            <Button asChild className="w-full mt-3" variant="ghost" size="sm">
              <Link to="/sponsor/donations">See history <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <CertificatesCard treesPlanted={treesPlanted} />
        </div>

        <div className="lg:col-span-12 bento-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h2 className="font-heading text-base font-semibold">Recent maintenance</h2>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/sponsor/maintenance">All updates <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="accent" size="sm">
                <Link to="/sponsor/sponsor"><Sparkles className="h-4 w-4" /> Sponsor more</Link>
              </Button>
            </div>
          </div>
          {logs.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (logs.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No watering updates yet for your trees.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {(logs.data?.items ?? []).slice(0, 4).map((log) => (
                <li key={log.id ?? log._id} className="py-3 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Droplets className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {log.plant?.species ?? 'Tree'} at {log.site?.name ?? 'a site'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Logged {formatRelative(log.createdAt)}
                      {log.volunteer?.name && <> by {log.volunteer.name}</>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// CO₂ impact stat tile. Shows the estimated lifetime absorption with a
// secondary line indicating the annual run-rate from currently-alive
// trees — so a donor with 5 alive trees sees both their cumulative
// impact and a forward-looking number.
function Co2StatTile({ className, co2 }) {
  const kg = co2?.co2Kg ?? null;
  let display;
  if (kg == null) display = '—';
  else if (kg >= 1000) display = `${(kg / 1000).toFixed(1)} t`;
  else display = `${kg.toFixed(1)} kg`;

  return (
    <div className={`bento-card p-5 sm:p-6 flex flex-col gap-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
          <Cloud className="h-5 w-5" aria-hidden />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80">
          estimated
        </span>
      </div>
      <div>
        <div className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {display}
          <span className="text-base font-medium text-muted-foreground ml-1.5">CO₂</span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Sequestered to date by your trees
        </div>
        {co2?.annualRateKg > 0 && (
          <div className="mt-2 text-xs text-muted-foreground/80">
            Currently absorbing{' '}
            <span className="font-medium text-foreground">
              {co2.annualRateKg.toLocaleString()} kg/year
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Donor-downloadable certificates. Both are PDFs streamed from the
// server — we use plain anchors so the browser handles the file dialog
// natively, no fetch buffer needed. The button is disabled (with a
// helpful tooltip) until at least one tree has been planted.
function CertificatesCard({ treesPlanted }) {
  const ready = treesPlanted > 0;
  return (
    <div className="bento-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-heading text-base font-semibold">Certificates</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Download a PDF certificate of your plantation impact or estimated CO₂ offset.
        {!ready && ' Available once your first tree is planted.'}
      </p>
      <div className="space-y-2 pt-1">
        <CertButton
          href="/api/certificates/plantation.pdf"
          download="plantation-certificate.pdf"
          icon={FileText}
          label="Plantation"
          disabled={!ready}
        />
        <CertButton
          href="/api/certificates/co2.pdf"
          download="co2-certificate.pdf"
          icon={Cloud}
          label="CO₂ offset"
          disabled={!ready}
        />
      </div>
    </div>
  );
}

function CertButton({ href, download, icon: Icon, label, disabled }) {
  // Disabled state: render as a flat div so we don't have a broken link
  // sitting in the DOM. Enabled state: anchor with download attribute.
  if (disabled) {
    return (
      <div className="inline-flex w-full items-center justify-between rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5 text-sm text-muted-foreground cursor-not-allowed">
        <span className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </span>
        <Download className="h-3.5 w-3.5" aria-hidden />
      </div>
    );
  }
  return (
    <a
      href={href}
      download={download}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {label}
      </span>
      <Download className="h-3.5 w-3.5 text-primary" aria-hidden />
    </a>
  );
}

// Biophilic sponsor CTA tile. Adapts copy depending on whether the
// donor has already given (returning donor → "Plant more") vs first
// visit (welcome → "Start your forest"). Always anchors to /donor/sponsor.
function SponsorCallout({ hasGiven, firstName }) {
  return (
    <div className="bento-card overflow-hidden border-none p-0 surface-biophilic relative">
      {/* Decorative leaf — out-of-flow, doesn't shift content */}
      <TreePine
        className="absolute -bottom-6 -right-3 h-32 w-32 text-leaf-200/60 pointer-events-none"
        aria-hidden
        strokeWidth={1.2}
      />
      <div className="relative p-6 space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-medium">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {hasGiven ? 'Grow your forest' : 'Start your forest'}
        </div>
        <h3 className="font-heading text-xl font-bold tracking-tight text-foreground leading-tight">
          {hasGiven
            ? 'Add more trees to your name'
            : `Plant your first tree${firstName ? `, ${firstName}` : ''}`}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {hasGiven
            ? 'Every additional tree gets the same GPS + photo + weekly maintenance proof you already trust.'
            : 'Pick how many — pay securely — watch volunteers plant them with photo evidence.'}
        </p>
        <Button asChild className="w-full mt-2" variant="accent">
          <Link to="/sponsor/sponsor">
            <Sparkles className="h-4 w-4" /> {hasGiven ? 'Sponsor more trees' : 'Sponsor my first tree'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
