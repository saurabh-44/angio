import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CalendarClock,
  Clipboard,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
} from '@/queries/assignments.js';
import { useCreateUser, useUsers } from '@/queries/users.js';
import { useSites } from '@/queries/sites.js';
import { useAuth } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const LIMIT = 20;
const KIND_OPTIONS = [
  { value: 'planting', label: 'Planting' },
  { value: 'maintenance', label: 'Maintenance' },
];
const KIND_PILL = {
  planting: 'bg-[#0B5000]/10 text-[#0B5000]',
  maintenance: 'bg-[#346EC4]/10 text-[#346EC4]',
};

export default function AssignmentsPage() {
  const { role } = useAuth();
  const isOwner = role === 'site_owner';
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newVolunteerOpen, setNewVolunteerOpen] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const { data, isLoading, isError, refetch } = useAssignments({ page, limit: LIMIT });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        {isOwner ? 'Volunteers on my sites' : 'Assignments'}
      </h1>
      <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
        {isOwner
          ? 'The volunteers planting and watering at the sites you manage. Add a new volunteer to your pool or assign someone you already have to a site.'
          : 'Match volunteers to sites for planting and weekly maintenance.'}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
        {isOwner && (
          <button
            type="button"
            onClick={() => setNewVolunteerOpen(true)}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#001F00] px-5 py-3 text-sm font-medium text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white"
          >
            <UserPlus className="h-5 w-5" aria-hidden /> Add volunteer
          </button>
        )}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#013300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" aria-hidden /> {isOwner ? 'Assign to site' : 'Assign volunteer'}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-7 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load assignments"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Clipboard}
            title="No assignments yet"
            description="Assign a volunteer to a site to start tracking their work."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Assign volunteer
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-7 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  {['Volunteer', 'Site', 'Kind', 'Active'].map((h) => (
                    <th key={h} className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1">
                      {h}
                    </th>
                  ))}
                  <th className="pb-4" />
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id ?? a._id} className="border-t border-[#E2E8F0]">
                    <td className="py-4 pr-4 first:pl-1">
                      <div className="font-medium text-[#001F00]">{a.volunteer?.name ?? '—'}</div>
                      <div className="text-xs text-[#1E1E1E]/50">{a.volunteer?.email}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-medium text-[#001F00]">{a.site?.name ?? '—'}</div>
                      {a.site?.address && (
                        <div className="line-clamp-1 max-w-xs text-xs text-[#1E1E1E]/50">
                          {a.site.address}
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize',
                          KIND_PILL[a.kind] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
                        )}
                      >
                        {a.kind}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]/60">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(a.startsAt)}
                        {a.endsAt && <> – {formatDate(a.endsAt)}</>}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirming(a)}
                        aria-label="Remove assignment"
                        className="inline-grid h-9 w-9 place-items-center rounded-lg text-[#1E1E1E]/50 transition-colors hover:bg-red-50 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (below lg) */}
          <div className="mt-7 space-y-3 lg:hidden">
            {items.map((a) => (
              <div key={a.id ?? a._id} className="rounded-[10px] border border-[#E2E8F0] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-[#001F00]">{a.volunteer?.name ?? '—'}</div>
                    <div className="truncate text-xs text-[#1E1E1E]/50">{a.volunteer?.email}</div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize',
                      KIND_PILL[a.kind] ?? 'bg-[#E2E8F0] text-[#1E1E1E]',
                    )}
                  >
                    {a.kind}
                  </span>
                </div>
                <div className="mt-2 text-sm text-[#001F00]">
                  {a.site?.name ?? '—'}
                  {a.site?.address && (
                    <span className="block text-xs text-[#1E1E1E]/50">{a.site.address}</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#1E1E1E]/60">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    {formatDate(a.startsAt)}
                    {a.endsAt && <> – {formatDate(a.endsAt)}</>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirming(a)}
                    aria-label="Remove assignment"
                    className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#1E1E1E]/50 transition-colors hover:bg-red-50 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <CreateAssignmentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateVolunteerDialog open={newVolunteerOpen} onOpenChange={setNewVolunteerOpen} />
      <DeleteAssignmentConfirm assignment={confirming} onClose={() => setConfirming(null)} />
    </div>
  );
}

// Site-owner-facing "add a volunteer to my pool" dialog. Creates a User
// with role=volunteer; backend stamps createdBy=actor so NGO admin can
// audit who added them and so the assignment dialog only shows owners
// their own pool.
function CreateVolunteerDialog({ open, onOpenChange }) {
  const create = useCreateUser();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  function close() {
    onOpenChange(false);
    reset();
  }

  async function onSubmit(values) {
    try {
      const result = await create.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        role: 'volunteer',
      });
      success(
        'Volunteer added',
        `A temp password was emailed to ${result.user?.email ?? values.email}. Now assign them to one of your sites.`,
      );
      close();
    } catch (err) {
      toastError(
        "Couldn't add volunteer",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="rounded-[10px] sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            Add a new volunteer
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            They'll receive an email with a temp password. After they sign in once you can assign
            them to any of your sites.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="v-firstName">First name</Label>
              <Input
                id="v-firstName"
                autoComplete="off"
                disabled={create.isPending}
                {...register('firstName', { required: 'Required' })}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-lastName">Last name</Label>
              <Input
                id="v-lastName"
                autoComplete="off"
                disabled={create.isPending}
                {...register('lastName', { required: 'Required' })}
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-email">Email</Label>
            <Input
              id="v-email"
              type="email"
              autoComplete="off"
              disabled={create.isPending}
              {...register('email', {
                required: 'Required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="v-phone">Phone (optional)</Label>
            <Input id="v-phone" disabled={create.isPending} {...register('phone')} />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <UserPlus className="h-4 w-4" /> Add volunteer
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateAssignmentDialog({ open, onOpenChange }) {
  const create = useCreateAssignment();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({ defaultValues: { kind: 'planting' } });
  const [volunteer, setVolunteer] = useState('');
  const [site, setSite] = useState('');
  const kind = watch('kind');

  // Always-on fetch (regardless of dialog open) so the data is there the
  // moment the dialog mounts. enabled:!!open would create a race where
  // the dropdown is empty for the first split-second after click.
  const volsQ = useUsers({ role: 'volunteer', limit: 200 });
  const sitesQ = useSites({ limit: 200 });
  const vols = volsQ.data?.items ?? [];
  const sites = sitesQ.data?.items ?? [];

  function close() {
    onOpenChange(false);
    reset({ kind: 'planting' });
    setVolunteer('');
    setSite('');
  }

  async function onSubmit(values) {
    if (!volunteer || !site) {
      toastError('Missing fields', 'Pick both a volunteer and a site.');
      return;
    }
    try {
      await create.mutateAsync({
        volunteer,
        site,
        kind: values.kind,
        startsAt: values.startsAt || undefined,
        endsAt: values.endsAt || undefined,
        note: values.note?.trim() || undefined,
      });
      success('Assignment created');
      close();
    } catch (err) {
      toastError(
        "Couldn't create assignment",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="rounded-[10px] sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            Assign a volunteer
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            Decide who plants or waters where. Volunteers see only the sites they're assigned to.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Volunteer</Label>
            <Select value={volunteer} onValueChange={setVolunteer} disabled={volsQ.isLoading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    volsQ.isLoading
                      ? 'Loading volunteers…'
                      : volsQ.isError
                        ? "Couldn't load volunteers"
                        : 'Pick a volunteer'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {volsQ.isError ? (
                  <div className="px-3 py-6 text-center text-sm text-destructive">
                    {volsQ.error?.message ?? 'Request failed.'}
                  </div>
                ) : vols.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {volsQ.isLoading ? 'Loading…' : 'No volunteers found.'}
                  </div>
                ) : (
                  vols
                    .filter((v) => (v.id ?? v._id))
                    .map((v) => (
                      <SelectItem key={v.id ?? v._id} value={String(v.id ?? v._id)}>
                        {v.name} <span className="text-muted-foreground">· {v.email}</span>
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={site} onValueChange={setSite} disabled={sitesQ.isLoading}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    sitesQ.isLoading
                      ? 'Loading sites…'
                      : sitesQ.isError
                        ? "Couldn't load sites"
                        : 'Pick a site'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sitesQ.isError ? (
                  <div className="px-3 py-6 text-center text-sm text-destructive">
                    {sitesQ.error?.message ?? 'Request failed.'}
                  </div>
                ) : sites.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {sitesQ.isLoading ? 'Loading…' : 'No sites available.'}
                  </div>
                ) : (
                  sites
                    .filter((s) => (s.id ?? s._id))
                    .map((s) => (
                      <SelectItem key={s.id ?? s._id} value={String(s.id ?? s._id)}>
                        {s.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kind of work</Label>
            <Select value={kind} onValueChange={(v) => setValue('kind', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Starts</Label>
              <Input id="startsAt" type="date" {...register('startsAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">Ends (optional)</Label>
              <Input id="endsAt" type="date" {...register('endsAt')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Input id="note" {...register('note')} />
          </div>

          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAssignmentConfirm({ assignment, onClose }) {
  const remove = useDeleteAssignment();
  const { success, error: toastError } = useToast();
  async function handleConfirm() {
    try {
      await remove.mutateAsync(assignment.id ?? assignment._id);
      success('Assignment removed');
      onClose();
    } catch (err) {
      toastError(
        "Couldn't remove",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }
  return (
    <ConfirmDialog
      open={!!assignment}
      onOpenChange={(o) => !o && onClose()}
      title="Remove assignment?"
      description="The volunteer will no longer appear on this site's roster."
      confirmLabel="Remove"
      destructive
      busy={remove.isPending}
      onConfirm={handleConfirm}
    />
  );
}
