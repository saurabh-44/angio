import { Link } from 'react-router-dom';
import { CalendarClock, Clipboard, Droplets, MapPin, Sprout } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useAssignments } from '@/queries/assignments.js';
import { formatDate, formatGeo } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const KIND_PILL = {
  planting: 'bg-[#0B5000]/10 text-[#0B5000]',
  maintenance: 'bg-[#346EC4]/10 text-[#346EC4]',
};

export default function VolunteerAssignments() {
  const { data, isLoading } = useAssignments({ limit: 50 });
  const items = data?.items ?? [];

  // Group by site so a volunteer doing both planting + maintenance on the
  // same site sees one card with both kind pills.
  const bySite = items.reduce((acc, a) => {
    const key = a.site?.id ?? a.site?._id ?? 'unknown';
    if (!acc[key]) acc[key] = { site: a.site, kinds: new Set(), assignments: [] };
    acc[key].kinds.add(a.kind);
    acc[key].assignments.push(a);
    return acc;
  }, {});
  const groups = Object.values(bySite);

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Your work</div>
      <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        My assignments
      </h1>
      <p className="mt-1 text-base text-[#1E1E1E]/50">
        The sites you're responsible for planting or maintaining.
      </p>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-[10px]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Clipboard}
            title="No assignments yet"
            description="The NGO or site owner will assign you to a site soon."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {groups.map(({ site, kinds, assignments }) => (
            <article
              key={site?.id ?? site?._id}
              className="space-y-4 rounded-[10px] border border-[#E2E8F0] bg-white p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-[#001F00]">
                    {site?.name ?? 'Site'}
                  </h2>
                  {site?.address && (
                    <p className="mt-0.5 line-clamp-1 text-sm text-[#1E1E1E]/50">{site.address}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {[...kinds].map((k) => (
                    <span
                      key={k}
                      className={cn(
                        'inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize',
                        KIND_PILL[k] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
                      )}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-[#1E1E1E]/60">
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

              <div className="flex gap-3 pt-1">
                <Link
                  to="/volunteer/plant"
                  state={{ siteId: site?.id ?? site?._id }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#0B5000] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#094200]"
                >
                  <Sprout className="h-4 w-4" aria-hidden /> Plant
                </Link>
                <Link
                  to="/volunteer/maintenance"
                  state={{ siteId: site?.id ?? site?._id }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2c5da6]"
                >
                  <Droplets className="h-4 w-4" aria-hidden /> Water
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
