import { Banknote, Droplets, Leaf, MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { StatTile } from '@/components/StatTile.jsx';
import { useAuth } from '@/lib/auth.jsx';

export default function AdminHome() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        eyebrow="NGO Admin"
        title={`Hi, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Big picture across donors, sites, plants, and weekly maintenance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-5">
        <StatTile className="lg:col-span-4" hero icon={Leaf} tone="leaf" value="—" label="Trees planted" sub="Live total across all sites" />
        <StatTile className="lg:col-span-4" icon={MapPin} tone="sky" value="—" label="Active sites" />
        <StatTile className="lg:col-span-4" icon={Banknote} tone="amber" value="—" label="Donations recorded" />
        <StatTile className="lg:col-span-6" icon={Droplets} tone="leaf" value="—" label="Logs this week" />
        <div className="bento-card p-6 lg:col-span-6">
          <h2 className="font-heading text-base font-semibold mb-2">Recent activity</h2>
          <p className="text-sm text-muted-foreground">
            Live planting + maintenance feed lands here.
          </p>
        </div>
      </div>
    </>
  );
}
