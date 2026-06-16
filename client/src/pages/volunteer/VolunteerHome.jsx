import { Link } from 'react-router-dom';
import { Camera, Clipboard, Leaf, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import { Button } from '@/components/ui/button.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { usePlants } from '@/queries/plants.js';
import { useAssignments } from '@/queries/assignments.js';
import { useMaintenance } from '@/queries/maintenance.js';

function dash(v) {
  return v == null ? '—' : String(v);
}

export default function VolunteerHome() {
  const { user } = useAuth();
  const plants = usePlants({ limit: 1 });
  const assignments = useAssignments({ limit: 1, active: true });
  const logs = useMaintenance({ limit: 1 });

  return (
    <>
      <PageHeader
        eyebrow="Volunteer"
        title={`Welcome, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Record what you plant and water in the field. Big buttons, no fuss."
        actions={
          <>
            <Button asChild variant="accent">
              <Link to="/volunteer/plant"><Sprout className="h-4 w-4" /> Record planting</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/volunteer/maintenance"><Camera className="h-4 w-4" /> Record watering</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile className="lg:col-span-4" hero icon={Leaf} tone="leaf" value={dash(plants.data?.total)} label="Trees you've planted" />
        <StatTile className="lg:col-span-4" icon={Clipboard} tone="sky" value={dash(assignments.data?.total)} label="Active assignments" />
        <StatTile className="lg:col-span-4" icon={Camera} tone="amber" value={dash(logs.data?.total)} label="Watering logs total" />

        <div className="bento-card p-6 lg:col-span-12 surface-biophilic">
          <h2 className="font-heading text-base font-semibold mb-1">Quick start</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tap one of the actions above when you're at a site. The forms guide you step-by-step —
            pick the site, capture GPS + photo, submit.
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link to="/volunteer/assignments">See my sites →</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
