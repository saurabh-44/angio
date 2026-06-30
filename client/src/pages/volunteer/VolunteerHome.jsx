import { Link } from 'react-router-dom';
import { Camera, Clipboard, Leaf, Sprout } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { usePlants } from '@/queries/plants.js';
import { useAssignments } from '@/queries/assignments.js';
import { useMaintenance } from '@/queries/maintenance.js';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

function dash(v) {
  return v == null ? '—' : String(v);
}

function StatCard({ icon: Icon, value, label, loading }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-6">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0B5000]/10 text-[#0B5000]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-9 w-16" />
      ) : (
        <div className="mt-4 text-4xl font-bold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          {value}
        </div>
      )}
      <div className="mt-1 text-sm text-[#1E1E1E]/60">{label}</div>
    </div>
  );
}

export default function VolunteerHome() {
  const { user } = useAuth();
  const plants = usePlants({ limit: 1 });
  const assignments = useAssignments({ limit: 1, active: true });
  const logs = useMaintenance({ limit: 1 });

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Volunteer</div>
        <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Welcome, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-base text-[#1E1E1E]/50">
          Record what you plant and water in the field. Big buttons, no fuss.
        </p>
      </PageHeading>

      {/* Primary field actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/volunteer/plant"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#0B5000] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#094200]"
        >
          <Sprout className="h-5 w-5" aria-hidden /> Record planting
        </Link>
        <Link
          to="/volunteer/maintenance"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6]"
        >
          <Camera className="h-5 w-5" aria-hidden /> Record watering
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          icon={Leaf}
          value={dash(plants.data?.total)}
          label="Trees you've planted"
          loading={plants.isLoading}
        />
        <StatCard
          icon={Clipboard}
          value={dash(assignments.data?.total)}
          label="Active assignments"
          loading={assignments.isLoading}
        />
        <StatCard
          icon={Camera}
          value={dash(logs.data?.total)}
          label="Watering logs total"
          loading={logs.isLoading}
        />
      </div>

      <div className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-6">
        <h2 className="text-base font-semibold text-[#001F00]">Quick start</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#1E1E1E]/60">
          When you're at a site, tap <strong className="font-medium text-[#001F00]">Record planting</strong>{' '}
          or <strong className="font-medium text-[#001F00]">Record watering</strong> above — the form
          guides you step-by-step: pick the site, capture GPS + photo, submit.
        </p>
        <Link
          to="/volunteer/assignments"
          className="mt-3 inline-flex text-sm font-medium text-[#0B5000] hover:underline"
        >
          See my sites →
        </Link>
      </div>
    </div>
  );
}
