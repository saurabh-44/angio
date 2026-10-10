import { useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Loader2, Plus, Search, Users } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import {
  useCancelEvent,
  useCreateEvent,
  useEvent,
  useEventAudience,
  useEvents,
} from '@/queries/events.js';
import { useSites } from '@/queries/sites.js';
import { ROLE_LABEL } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

const DEFAULT_VOLUNTEERS_NEEDED = 10;

// Event dates are calendar days stored at UTC midnight — format in UTC so
// the day never shifts with the viewer's timezone.
function formatEventDate(d) {
  return formatDate(d, { timeZone: 'UTC' });
}

function siteLocation(site) {
  if (!site) return '—';
  return [site.name, site.city].filter(Boolean).join(', ');
}

// Volunteering events (Figma "for admin & site incharge view"): upcoming
// events table + Create Event. Admins see every site, site in-charges their
// own. Past events drop off the list (they stay in the DB).
export default function EventsPage() {
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState(null);
  const { data, isLoading, isError, refetch } = useEvents({ q: q.trim() || undefined });
  const items = data?.items ?? [];

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Events
        </h1>
        <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
          Post a volunteering event. Volunteers, site in-charges and admins are invited by email;
          volunteers accept or decline from the app.
        </p>
      </PageHeading>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1E1E1E]/40" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event"
            className="pl-10"
            aria-label="Search events"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#0B5000] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#094200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" aria-hidden /> Create Event
        </button>
      </div>

      {isLoading ? (
        <div className="mt-7 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState title="Couldn't load events" action={<Button onClick={() => refetch()}>Retry</Button>} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={CalendarDays}
            title={q ? 'No events match that search' : 'No upcoming events'}
            description="Create an event and everyone invited gets an email and an in-app request."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-7 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  {['Event', 'Date', 'Created By', 'Volunteers', 'Time', 'Location'].map((h) => (
                    <th key={h} className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1">
                      {h}
                    </th>
                  ))}
                  <th className="pb-4" aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setOpenId(e.id)}
                    className="cursor-pointer border-t border-[#E2E8F0] transition-colors hover:bg-[#F6FAF6]"
                  >
                    <td className="py-4 pr-4 first:pl-1">
                      <div className="font-medium text-[#001F00]">{e.name}</div>
                      {e.status === 'cancelled' && <CancelledPill />}
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]">{formatEventDate(e.date)}</td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]/70">{e.createdBy?.email ?? '—'}</td>
                    <td className="py-4 pr-4 text-sm font-medium text-[#001F00]">
                      {e.acceptedCount}/{e.volunteersNeeded}
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]">{e.time}</td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]">{siteLocation(e.site)}</td>
                    <td className="py-4 text-right">
                      <ChevronRight className="ml-auto h-5 w-5 text-[#001F00]" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (below lg) */}
          <div className="mt-7 space-y-3 lg:hidden">
            {items.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setOpenId(e.id)}
                className="w-full rounded-[10px] border border-[#E2E8F0] p-4 text-left transition-colors hover:border-[#001F00]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-[#001F00]">{e.name}</div>
                    <div className="mt-0.5 truncate text-xs text-[#1E1E1E]/50">{siteLocation(e.site)}</div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#001F00]">
                    {e.acceptedCount}/{e.volunteersNeeded}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#1E1E1E]/50">
                  <span>
                    {formatEventDate(e.date)} · {e.time}
                  </span>
                  {e.status === 'cancelled' ? <CancelledPill /> : <ChevronRight className="h-4 w-4 text-[#001F00]" aria-hidden />}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <CreateEventSheet open={createOpen} onOpenChange={setCreateOpen} />
      <EventDetailSheet id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CancelledPill() {
  return (
    <span className="mt-1 inline-flex rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-[#1E1E1E]/70">
      Cancelled
    </span>
  );
}

const EMPTY_FORM = { name: '', date: '', time: '', note: '', volunteersNeeded: String(DEFAULT_VOLUNTEERS_NEEDED) };

function CreateEventSheet({ open, onOpenChange }) {
  const create = useCreateEvent();
  const { success, error: toastError } = useToast();
  const sitesQ = useSites({ limit: 200 });
  const sites = sitesQ.data?.items ?? [];
  const [site, setSite] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [audience, setAudience] = useState('all');
  const [excluded, setExcluded] = useState(() => new Set());
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = new Date().toLocaleDateString('en-CA');

  function close() {
    onOpenChange(false);
    setSite('');
    setForm(EMPTY_FORM);
    setAudience('all');
    setExcluded(new Set());
  }

  async function submit(e) {
    e.preventDefault();
    if (!site) return toastError('Pick a site', 'Choose where the event happens.');
    if (!form.name.trim()) return toastError('Event name', 'Give the event a name.');
    if (!form.date || !form.time) return toastError('Date and time', 'Pick when the event starts.');
    const needed = parseInt(form.volunteersNeeded, 10);
    try {
      const res = await create.mutateAsync({
        site,
        name: form.name.trim(),
        date: form.date,
        time: form.time,
        note: form.note.trim() || undefined,
        volunteersNeeded: Number.isFinite(needed) && needed > 0 ? needed : DEFAULT_VOLUNTEERS_NEEDED,
        audience,
        excludedUsers: [...excluded],
      });
      success('Event posted', `${res.invited} ${res.invited === 1 ? 'person' : 'people'} invited.`);
      close();
    } catch (err) {
      toastError("Couldn't post event", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  const busy = create.isPending;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            Create event
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">
            Everyone invited gets an email. Sponsors are never invited.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="-mx-2 mt-6 flex-1 space-y-4 overflow-y-auto px-2" noValidate>
          <div className="space-y-2">
            <Label className="text-[#001F00]">Site</Label>
            <Select
              value={site}
              onValueChange={(v) => {
                setSite(v);
                setExcluded(new Set());
              }}
              disabled={busy || sitesQ.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={sitesQ.isLoading ? 'Loading…' : 'Pick a site'} />
              </SelectTrigger>
              <SelectContent>
                {sites.length === 0 && !sitesQ.isLoading ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No sites yet.</div>
                ) : (
                  sites.map((s) => (
                    <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>
                      {s.name}
                      {s.city && <span className="text-muted-foreground"> · {s.city}</span>}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-name" className="text-[#001F00]">Event name</Label>
            <Input id="ev-name" value={form.name} onChange={set('name')} placeholder="e.g. Monsoon planting drive" disabled={busy} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ev-date" className="text-[#001F00]">Date</Label>
              <Input id="ev-date" type="date" min={today} value={form.date} onChange={set('date')} disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-time" className="text-[#001F00]">Time</Label>
              <Input id="ev-time" type="time" value={form.time} onChange={set('time')} disabled={busy} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-needed" className="text-[#001F00]">Volunteers needed</Label>
            <Input
              id="ev-needed"
              type="number"
              min="1"
              value={form.volunteersNeeded}
              onChange={set('volunteersNeeded')}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-note" className="text-[#001F00]">Short note</Label>
            <textarea
              id="ev-note"
              rows={3}
              maxLength={1000}
              value={form.note}
              onChange={set('note')}
              disabled={busy}
              placeholder="What to bring, where to meet…"
              className="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {site && (
            <AudiencePicker
              site={site}
              audience={audience}
              onAudienceChange={(a) => {
                setAudience(a);
                setExcluded(new Set());
              }}
              excluded={excluded}
              onExcludedChange={setExcluded}
              disabled={busy}
            />
          )}

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Post event
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// "Who gets invited": everyone, or only this site's team — then a ticked
// list of those people; untick anyone to leave them out.
function AudiencePicker({ site, audience, onAudienceChange, excluded, onExcludedChange, disabled }) {
  const { data, isLoading } = useEventAudience({ site, audience });
  const [filter, setFilter] = useState('');
  const people = data?.items ?? [];
  // Site in-charges only see their own volunteers; everyone else invited is
  // a count from the server.
  const hidden = data?.hiddenCount ?? 0;
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return people;
    return people.filter((p) => `${p.name} ${p.email}`.toLowerCase().includes(f));
  }, [people, filter]);
  const invitedCount = people.filter((p) => !excluded.has(p.id)).length + hidden;

  function toggle(id) {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onExcludedChange(next);
  }

  return (
    <div className="space-y-3">
      <Label className="block text-[#001F00]">Who gets invited</Label>
      <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#E2E8F0] p-1">
        {[
          { v: 'all', label: 'Everyone' },
          { v: 'site', label: "This site's team" },
        ].map((opt) => (
          <button
            key={opt.v}
            type="button"
            disabled={disabled}
            onClick={() => onAudienceChange(opt.v)}
            className={cn(
              'rounded-[8px] px-4 py-2 text-sm font-medium transition-colors',
              audience === opt.v
                ? 'bg-[#0B5000] text-white'
                : 'text-[#1E1E1E]/60 hover:bg-[#F6FAF6] hover:text-[#001F00]',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-[#1E1E1E]/50">
        {audience === 'all'
          ? 'All volunteers, site in-charges and admins.'
          : "Admins, this site's in-charge and the volunteers assigned to it."}{' '}
        Untick anyone you want to leave out.
      </p>

      <div className="rounded-[10px] border border-[#E2E8F0]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001F00]">
            <Users className="h-4 w-4" aria-hidden />
            {isLoading ? 'Loading…' : `${invitedCount} of ${people.length + hidden} invited`}
          </span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Find…"
            aria-label="Find a person"
            className="w-28 rounded-md border border-[#E2E8F0] px-2 py-1 text-xs outline-none focus:border-[#0B5000]"
          />
        </div>
        <ul className="max-h-56 overflow-y-auto">
          {shown.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-[#F6FAF6]">
                <input
                  type="checkbox"
                  checked={!excluded.has(p.id)}
                  onChange={() => toggle(p.id)}
                  disabled={disabled}
                  className="h-4 w-4 accent-[#0B5000]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[#001F00]">{p.name}</span>
                  <span className="block truncate text-xs text-[#1E1E1E]/50">{p.email}</span>
                </span>
                <span className="shrink-0 text-[11px] text-[#1E1E1E]/50">{ROLE_LABEL[p.role] ?? p.role}</span>
              </label>
            </li>
          ))}
          {hidden > 0 && !filter.trim() && (
            <li className="px-3 py-2 text-xs text-[#1E1E1E]/50">
              + {hidden} other {hidden === 1 ? 'person' : 'people'} (admins, in-charges and volunteers outside your sites)
            </li>
          )}
          {!isLoading && shown.length === 0 && hidden === 0 && (
            <li className="px-3 py-4 text-center text-xs text-[#1E1E1E]/50">Nobody to invite.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Event detail: info + the volunteers who accepted. Cancel lives here.
function EventDetailSheet({ id, onClose }) {
  const { data, isLoading } = useEvent(id);
  const cancel = useCancelEvent();
  const { success, error: toastError } = useToast();
  const [confirming, setConfirming] = useState(false);
  const ev = data?.event;

  async function doCancel() {
    try {
      await cancel.mutateAsync(id);
      success('Event cancelled', 'Volunteers who accepted have been emailed.');
      setConfirming(false);
    } catch (err) {
      toastError("Couldn't cancel", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            {ev?.name ?? 'Event'}
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">
            {ev ? `${siteLocation(ev.site)} · ${formatEventDate(ev.date)} at ${ev.time}` : ' '}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !ev ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="-mx-2 mt-6 flex-1 space-y-5 overflow-y-auto px-2">
            {ev.status === 'cancelled' && <CancelledPill />}
            {ev.note && <p className="text-sm leading-relaxed text-[#1E1E1E]">{ev.note}</p>}

            <div className="grid grid-cols-3 gap-3">
              <Stat label="Accepted" value={`${ev.acceptedCount}/${ev.volunteersNeeded}`} />
              <Stat label="Declined" value={ev.rejectedCount} />
              <Stat label="Invited" value={ev.invitedCount} />
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#001F00]">Volunteers who accepted</h3>
              {ev.accepted.length === 0 ? (
                <p className="mt-2 text-sm text-[#1E1E1E]/50">No one has accepted yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#E2E8F0] rounded-[10px] border border-[#E2E8F0]">
                  {ev.accepted.map((p) => (
                    <li key={p.id} className="px-3 py-2.5">
                      <div className="text-sm font-medium text-[#001F00]">{p.name}</div>
                      <div className="text-xs text-[#1E1E1E]/50">
                        {p.email}
                        {p.phone && <> · {p.phone}</>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-[#1E1E1E]/50">Posted by {ev.createdBy?.email ?? '—'}</p>
          </div>
        )}

        {ev && ev.status !== 'cancelled' && (
          <SheetFooter className="pt-4">
            <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
              Cancel event
            </Button>
          </SheetFooter>
        )}
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Cancel this event?"
          description="It disappears from volunteers' requests, and everyone who accepted gets an email."
          confirmLabel="Cancel event"
          cancelLabel="Keep it"
          destructive
          busy={cancel.isPending}
          onConfirm={doCancel}
        />
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] p-3">
      <div className="text-[11px] uppercase tracking-wide text-[#1E1E1E]/50">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[#001F00]">{value}</div>
    </div>
  );
}
