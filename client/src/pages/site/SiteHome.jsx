import { Droplets, Leaf, MapPin, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { useSites } from '@/queries/sites.js';
import { usePlants } from '@/queries/plants.js';
import { useMaintenance } from '@/queries/maintenance.js';
import { useAssignments } from '@/queries/assignments.js';

function dash(v) {
  return v == null ? '—' : String(v);
}

export default function SiteHome() {
  const { user } = useAuth();
  const sites = useSites({ limit: 1 });
  const plants = usePlants({ limit: 1 });
  const logs = useMaintenance({ limit: 1 });
  const assignments = useAssignments({ limit: 1, active: true });

  return (
    <>
      <PageHeader
        eyebrow="Site Owner"
        title={`Hi, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Your sites, volunteers, and this week's maintenance progress."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile className="lg:col-span-3" hero icon={MapPin} tone="leaf" value={dash(sites.data?.total)} label="Sites you manage" />
        <StatTile className="lg:col-span-3" icon={Leaf} tone="sky" value={dash(plants.data?.total)} label="Trees on your sites" />
        <StatTile className="lg:col-span-3" icon={Users} tone="amber" value={dash(assignments.data?.total)} label="Active volunteers" />
        <StatTile className="lg:col-span-3" icon={Droplets} tone="leaf" value={dash(logs.data?.total)} label="Logs total" />

        <div className="bento-card p-6 lg:col-span-12 surface-biophilic">
          <h2 className="font-heading text-base font-semibold mb-1">This week's priorities</h2>
          <p className="text-sm text-muted-foreground">
            Check the <strong>Maintenance</strong> tab for trees that still need watering this week,
            and the <strong>Volunteers</strong> tab to assign new helpers to your sites.
          </p>
        </div>
      </div>
    </>
  );
}
