import { Cloud, Download, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { usePlants } from '@/queries/plants.js';
import { useMaintenance } from '@/queries/maintenance.js';
import { useDonations } from '@/queries/donations.js';
import { useDonorCo2 } from '@/queries/co2.js';
import { formatAmount } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

// Figma sponsor dashboard: a bento of grey stat cards. Data layer is unchanged
// — the same plants / maintenance / donations / CO₂ queries feed the numbers,
// only the presentation is new.
function co2Display(summary) {
  const kg = summary?.co2Kg ?? null;
  if (kg == null) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}Kg`;
}

// One stat card: label up top, big number + sub pinned to the bottom.
function StatCard({ label, value, sub, loading, className }) {
  return (
    <div
      className={cn(
        // Compact on mobile (auto height, grouped content); the full Figma
        // bento — tall card with the number pinned to the bottom — is lg+ only.
        'flex flex-col gap-1.5 rounded-lg bg-[#DCE6F5] p-5 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)] lg:min-h-[200px] lg:justify-between lg:gap-0',
        className,
      )}
      style={{ fontFamily: BODY_FONT }}
    >
      <div className="text-sm font-medium text-[#001F00] lg:text-base">{label}</div>
      <div>
        {loading ? (
          <Skeleton className="h-9 w-24 bg-black/10 lg:h-12" />
        ) : (
          <div
            className="text-3xl font-bold leading-tight text-[#001F00] lg:text-5xl lg:leading-none"
            style={{ fontFamily: HEADING_FONT }}
          >
            {value}
          </div>
        )}
        {sub && (
          <div className="mt-1.5 text-xs font-light text-[#1E1E1E]/45 lg:mt-2.5 lg:text-base">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SponsorHome() {
  const { user } = useAuth();
  const plantsAll = usePlants({ limit: 6 });
  const plantsAlive = usePlants({ status: 'alive', limit: 1 });
  const logs = useMaintenance({ limit: 4 });
  const donations = useDonations({ limit: 1, status: 'paid' });
  const donationsForTotal = useDonations({ limit: 100, status: 'paid' });
  const co2 = useDonorCo2();

  const planted = plantsAll.data?.total ?? null;
  const alive = plantsAlive.data?.total ?? null;
  const sites = new Set(
    (plantsAll.data?.items ?? [])
      .map((p) => p.site?.id ?? p.site?._id ?? p.site)
      .filter(Boolean),
  ).size;
  const donatedTotal = (donationsForTotal.data?.items ?? []).reduce(
    (s, d) => s + (d.amount ?? 0),
    0,
  );
  const donationCount = donations.data?.total ?? 0;
  const survival = planted != null && alive != null ? `${alive}/${planted}` : '—';
  const treesPlanted = plantsAll.data?.total ?? 0;

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      {/* Heading */}
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Dashboard
        </h1>
      </PageHeading>

      {/* Bento stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Tree Donated"
          value={planted ?? '—'}
          sub="Total till date"
          loading={plantsAll.isLoading}
        />
        <StatCard
          label="CO₂ Absorbed"
          value={co2Display(co2.data?.summary)}
          sub="Total till date"
          loading={co2.isLoading}
        />
        <StatCard
          label="Tree Survival Rate"
          value={survival}
          sub="Alive vs planted, till date"
          loading={plantsAll.isLoading || plantsAlive.isLoading}
          className="lg:row-span-2"
        />
        <StatCard
          label="Sites Contributed To"
          value={sites > 0 ? sites : '—'}
          sub="Total till date"
          loading={plantsAll.isLoading}
        />
        <StatCard
          label="Total Donated"
          value={formatAmount(donatedTotal)}
          sub={`${donationCount} donation${donationCount === 1 ? '' : 's'} logged`}
          loading={donationsForTotal.isLoading}
        />
        <StatCard
          label="Watering Checks"
          value={logs.data?.total ?? '—'}
          sub="Field updates received"
          loading={logs.isLoading}
        />
        <CertificatesCard treesPlanted={treesPlanted} className="sm:col-span-2 lg:col-span-2" />
      </div>
    </div>
  );
}

// Certificate downloads, kept in the bento so the feature survives the redesign.
// Plain anchors so the browser handles the PDF stream; disabled until a tree
// has actually been planted.
function CertificatesCard({ treesPlanted, className }) {
  const ready = treesPlanted > 0;
  return (
    <div
      className={cn(
        'flex min-h-[200px] flex-col rounded-lg bg-[#DCE6F5] p-5 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.18)]',
        className,
      )}
      style={{ fontFamily: BODY_FONT }}
    >
      <div className="text-base font-medium text-[#001F00]">Certificates</div>
      <p className="mt-2 text-sm font-light text-[#1E1E1E]/60">
        Download your plantation impact or estimated CO₂ offset as a PDF.
        {!ready && ' Available once your first tree is planted.'}
      </p>
      <div className="mt-auto grid grid-cols-1 gap-3 pt-5 sm:grid-cols-2">
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
  const base =
    'inline-flex w-full items-center justify-between rounded-full px-5 py-3 text-sm font-medium transition-colors';
  if (disabled) {
    return (
      <div className={cn(base, 'cursor-not-allowed border border-[#001F00]/15 text-[#1E1E1E]/40')}>
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
      className={cn(base, 'border border-[#001F00] text-[#001F00] hover:bg-[#001F00]/5')}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </span>
      <Download className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
