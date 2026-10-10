import { Bell, Check, MapPin, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';
import { useEventInvites, useRespondToEvent } from '@/queries/events.js';

// Header bell (Figma "view"): a volunteer's open volunteering requests,
// each with decline (✕) and Accept. A response is final, so the request
// leaves the list as soon as it's answered. Renders nothing for other roles.
export default function EventInvitesBell() {
  const { role } = useAuth();
  const isVolunteer = role === 'volunteer';
  const { data } = useEventInvites({ enabled: isVolunteer });
  const respond = useRespondToEvent();
  const { success, error: toastError } = useToast();
  if (!isVolunteer) return null;

  const items = data?.items ?? [];

  async function answer(event, response) {
    try {
      await respond.mutateAsync({ id: event.id, response });
      success(
        response === 'accepted' ? "You're in" : 'Request declined',
        response === 'accepted' ? `See you at ${event.name}.` : undefined,
      );
    } catch (err) {
      toastError("Couldn't save your answer", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Volunteering requests${items.length ? ` (${items.length})` : ''}`}
        className="relative grid h-10 w-10 shrink-0 select-none place-items-center rounded-full border border-[#E2E8F0] bg-white text-[#001F00] transition-colors hover:bg-[#F6FAF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className={items.length ? 'h-5 w-5 text-[#DC2626]' : 'h-5 w-5'} aria-hidden />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#DC2626] px-1 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] max-w-[calc(100vw-2rem)] p-0">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No new requests.</div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-[#E2E8F0] overflow-y-auto">
            {items.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[#001F00]">{ev.name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-[#1E1E1E]/60">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {[ev.site?.name, ev.site?.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#1E1E1E]/60">
                    {formatDate(ev.date, { timeZone: 'UTC' })} · {ev.time}
                  </div>
                  {ev.note && <p className="mt-1 line-clamp-2 text-xs text-[#1E1E1E]/70">{ev.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => answer(ev, 'rejected')}
                    disabled={respond.isPending}
                    aria-label={`Decline ${ev.name}`}
                    className="grid h-7 w-7 place-items-center rounded-full bg-[#9CA3AF] text-white transition-colors hover:bg-[#6B7280] disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => answer(ev, 'accepted')}
                    disabled={respond.isPending}
                    className="inline-flex h-7 items-center gap-1 rounded-full bg-[#0B5000] px-3 text-xs font-medium text-white transition-colors hover:bg-[#094200] disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden /> Accept
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
