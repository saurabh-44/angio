import { Link } from 'react-router-dom';
import { CalendarClock, Clipboard, Leaf, MapPin, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAssignments } from '@/queries/assignments.js';
import { formatDate, formatGeo } from '@/lib/format.js';

export default function VolunteerAssignments() {
  const { data, isLoading } = useAssignments({ limit: 50 });
  const items = data?.items ?? [];

  // Group by site so a volunteer doing both planting + maintenance on the
  // same site sees one card with two role badges.
  const bySite = items.reduce((acc, a) => {
    const key = a.site?.id ?? a.site?._id ?? 'unknown';
    if (!acc[key]) acc[key] = { site: a.site, kinds: new Set(), assignments: [] };
    acc[key].kinds.add(a.kind);
    acc[key].assignments.push(a);
    return acc;
  }, {});
  const groups = Object.values(bySite);

  return (
    <>
      <PageHeader
        eyebrow="Your work"
        title="My assignments"
        description="The sites you're responsible for planting or maintaining."
        actions={
          <>
            <Button asChild variant="accent">
              <Link to="/volunteer/plant"><Sprout className="h-4 w-4" /> Record planting</Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Clipboard}
          title="No assignments yet"
          description="The NGO or site owner will assign you to a site soon."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(({ site, kinds, assignments }) => (
            <article key={site?.id ?? site?._id} className="bento-card p-6 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-base font-semibold text-foreground truncate">
                    {site?.name ?? 'Site'}
                  </h2>
                  {site?.address && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {site.address}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                  {[...kinds].map((k) => (
                    <Badge key={k} variant="default" className="capitalize">{k}</Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {site?.geo && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-mono">{formatGeo(site.geo)}</span>
                  </span>
                )}
                {assignments[0]?.startsAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Since {formatDate(assignments[0].startsAt)}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1" variant="accent">
                  <Link to="/volunteer/plant" state={{ siteId: site?.id ?? site?._id }}>
                    <Sprout className="h-4 w-4" /> Plant
                  </Link>
                </Button>
                <Button asChild className="flex-1" variant="outline">
                  <Link to="/volunteer/maintenance" state={{ siteId: site?.id ?? site?._id }}>
                    <Leaf className="h-4 w-4" /> Water
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
