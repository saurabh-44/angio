import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Leaf, MapPin, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import PlantCard from '@/components/PlantCard.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { usePlants } from '@/queries/plants.js';
import { useMaintenance } from '@/queries/maintenance.js';
import { useDonations } from '@/queries/donations.js';
import { formatAmount, formatRelative } from '@/lib/format.js';

function dash(v) {
  return v == null ? '—' : String(v);
}

export default function DonorHome() {
  const { user } = useAuth();
  const plantsAll = usePlants({ limit: 6 });
  const plantsAlive = usePlants({ status: 'alive', limit: 1 });
  const logs = useMaintenance({ limit: 4 });
  const donations = useDonations({ limit: 1 });
  const donationsForTotal = useDonations({ limit: 100 });

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
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile
          className="lg:col-span-6"
          hero
          icon={Leaf}
          tone="leaf"
          value={dash(plantsAlive.data?.total)}
          label="Trees alive from your donations"
          sub={`${dash(plantsAll.data?.total)} planted total`}
        />
        <StatTile
          className="lg:col-span-3"
          icon={MapPin}
          tone="sky"
          value={recentSites.size > 0 ? `${recentSites.size}+` : '—'}
          label="Sites you've funded"
        />
        <StatTile
          className="lg:col-span-3"
          icon={Droplets}
          tone="amber"
          value={dash(logs.data?.total)}
          label="Watering checks logged"
        />

        <div className="lg:col-span-8 bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-base font-semibold">Recently planted</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest trees the team has put in the ground for you.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/donor/trees">View all <ArrowRight className="h-4 w-4" /></Link>
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
          <div className="bento-card surface-biophilic p-6 flex flex-col gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <h3 className="font-heading text-base font-semibold">Verified weekly</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Volunteers upload geo-tagged photos each week. You see them as soon as they arrive.
            </p>
            <Button asChild className="w-full mt-2" variant="outline">
              <Link to="/donor/map">Open the map <ArrowRight className="h-4 w-4" /></Link>
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
              <Link to="/donor/donations">See history <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-12 bento-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold">Recent maintenance</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/donor/maintenance">All updates <ArrowRight className="h-4 w-4" /></Link>
            </Button>
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
