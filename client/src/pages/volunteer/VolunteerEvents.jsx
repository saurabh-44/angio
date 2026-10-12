import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Sprout, UserRound } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useMyEvents } from '@/queries/events.js';
import { formatDate } from '@/lib/format.js';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

// Events the volunteer accepted (upcoming only) — read-only details.
// Volunteers can't post events; new requests arrive in the header bell.
export default function VolunteerEvents() {
  const { data, isLoading } = useMyEvents();
  const items = data?.items ?? [];

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Your work</div>
        <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          My events
        </h1>
        <p className="mt-1 text-base text-[#1E1E1E]/50">
          Events you've said yes to. New requests show up in the bell.
        </p>
      </PageHeading>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-[10px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={CalendarDays}
            title="No upcoming events"
            description="Accept a request from the bell at the top and it will show up here."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {items.map((ev) => {
            const cancelled = ev.status === 'cancelled';
            return (
              <article key={ev.id} className="space-y-4 rounded-[10px] border border-[#E2E8F0] bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="min-w-0 text-lg font-semibold text-[#001F00]">{ev.name}</h2>
                  {cancelled && (
                    <span className="inline-flex shrink-0 rounded-full bg-[#DC2626]/10 px-3 py-1 text-xs font-medium text-[#DC2626]">
                      Cancelled
                    </span>
                  )}
                </div>

                <dl className="space-y-2 text-sm text-[#1E1E1E]/70">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0B5000]" aria-hidden />
                    <div className="min-w-0">
                      <div className="font-medium text-[#001F00]">
                        {[ev.site?.name, ev.site?.city].filter(Boolean).join(', ')}
                      </div>
                      {ev.site?.address && <div className="text-[#1E1E1E]/50">{ev.site.address}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#0B5000]" aria-hidden />
                    {formatDate(ev.date, { timeZone: 'UTC' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-[#0B5000]" aria-hidden />
                    {ev.time}
                  </div>
                  {ev.createdBy?.name && (
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0 text-[#0B5000]" aria-hidden />
                      Posted by {ev.createdBy.name}
                    </div>
                  )}
                </dl>

                {ev.note && (
                  <p className="whitespace-pre-line rounded-lg bg-[#F6FAF6] p-3 text-sm text-[#1E1E1E]/70">{ev.note}</p>
                )}

                {!cancelled && ev.site?.id && (
                  <Link
                    to="/volunteer/plant"
                    state={{ siteId: ev.site.id }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0B5000] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#094200]"
                  >
                    <Sprout className="h-4 w-4" aria-hidden /> Record planting here
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
