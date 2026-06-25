import { Leaf, MapPin, Sprout, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth.jsx';
import { useSites, useMySitesSummary } from '@/queries/sites.js';
import { usePlants } from '@/queries/plants.js';
import { useAssignments } from '@/queries/assignments.js';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

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

export default function SiteHome() {
  const { user } = useAuth();
  const sites = useSites({ limit: 1 });
  const plants = usePlants({ limit: 1 });
  const summary = useMySitesSummary();
  const assignments = useAssignments({ limit: 1, active: true });

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <div>
        <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Site Owner</div>
        <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Hi, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-base text-[#1E1E1E]/50">
          Your sites, volunteers, trees to plant, and maintenance progress.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={MapPin}
          value={dash(sites.data?.total)}
          label="Sites you manage"
          loading={sites.isLoading}
        />
        <StatCard
          icon={Leaf}
          value={dash(plants.data?.total)}
          label="Trees on your sites"
          loading={plants.isLoading}
        />
        <StatCard
          icon={Users}
          value={dash(assignments.data?.total)}
          label="Active volunteers"
          loading={assignments.isLoading}
        />
        <StatCard
          icon={Sprout}
          value={dash(summary.data?.treesToPlant)}
          label="Trees to plant"
          loading={summary.isLoading}
        />
      </div>

      <div className="mt-6 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-6">
        <h2 className="text-base font-semibold text-[#001F00]">This week's priorities</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#1E1E1E]/60">
          Open a site to see its full record, <strong className="font-medium text-[#001F00]">Plants</strong>{' '}
          for each tree's watering history and location, and{' '}
          <strong className="font-medium text-[#001F00]">Volunteers</strong> to assign helpers to your
          sites.
        </p>
      </div>
    </div>
  );
}
