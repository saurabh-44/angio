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
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const LIMIT = 20;
const KIND_OPTIONS = [
  { value: 'planting', label: 'Planting' },
  { value: 'maintenance', label: 'Maintenance' },
];

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
    <>
      <PageHeader
        eyebrow={isOwner ? 'Your field crew' : 'Field roster'}
        title={isOwner ? 'Volunteers on my sites' : 'Assignments'}
        description={
          isOwner
            ? 'The volunteers planting and watering at the sites you manage. Add a new volunteer to your pool or assign someone you already have to a site.'
            : 'Match volunteers to sites for planting and weekly maintenance.'
        }
        actions={
          <>
            {isOwner && (
              <Button variant="outline" onClick={() => setNewVolunteerOpen(true)}>
                <UserPlus className="h-4 w-4" /> Add volunteer
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> {isOwner ? 'Assign to site' : 'Assign volunteer'}
            </Button>
          </>
        }
      />

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load assignments"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : items.length === 0 ? (
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
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Volunteer</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id ?? a._id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{a.volunteer?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{a.volunteer?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{a.site?.name ?? '—'}</div>
                      {a.site?.address && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {a.site.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="default" className="capitalize">{a.kind}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(a.startsAt)}
                        {a.endsAt && <> – {formatDate(a.endsAt)}</>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirming(a)}
                        aria-label="Remove assignment"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border/60 px-4">
              <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <CreateAssignmentDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateVolunteerDialog open={newVolunteerOpen} onOpenChange={setNewVolunteerOpen} />
      <DeleteAssignmentConfirm
        assignment={confirming}
        onClose={() => setConfirming(null)}
      />
    </>
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
        name: values.name.trim(),
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new volunteer</DialogTitle>
          <DialogDescription>
            They'll receive an email with a temp password. After they sign in once you can assign
            them to any of your sites.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="v-name">Full name</Label>
            <Input
              id="v-name"
              autoComplete="off"
              disabled={create.isPending}
              {...register('name', { required: 'Required' })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <UserPlus className="h-4 w-4" /> Add volunteer
            </Button>
          </DialogFooter>
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a volunteer</DialogTitle>
          <DialogDescription>
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
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
