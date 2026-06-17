import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserX,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import RoleBadge from '@/components/RoleBadge.jsx';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAuth, ROLE_LABEL } from '@/lib/auth.jsx';
import {
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useUpdateUser,
  useUsers,
} from '@/queries/users.js';
import { useSites } from '@/queries/sites.js';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = ['sponsor', 'site_owner', 'volunteer', 'ngo_admin'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const LIMIT = 20;

export default function UsersPage() {
  const { user: actor } = useAuth();
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading, isError, refetch } = useUsers({
    role: role || undefined,
    q: q || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Sponsors, site owners, and volunteers in the system. NGO admins can be added here too."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="cursor-pointer">
            <UserPlus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email"
            className="pl-10"
          />
        </div>
        <Select
          value={role || 'all'}
          onValueChange={(v) => {
            setRole(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorRow onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={q || role ? 'No matches' : 'No users yet'}
            description={
              q || role
                ? 'Try clearing the filter or search.'
                : 'Add a sponsor, site owner, or volunteer to get started.'
            }
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add user
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow
                    key={u.id ?? u._id}
                    className="cursor-pointer"
                    onClick={() => setEditing(u)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {u.email}
                        {u.phone && <span className="ml-2">· {u.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} />
                        {u.isPrimary && <Badge variant="accent">Primary</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                      {u.forcePasswordChange && (
                        <Badge variant="outline" className="ml-2">Pending setup</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        user={u}
                        actor={actor}
                        onEdit={() => setEditing(u)}
                        onDelete={() => setConfirmingDelete(u)}
                      />
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

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} actor={actor} />
      <EditUserSheet user={editing} onClose={() => setEditing(null)} actor={actor} />
      <DeleteUserConfirm
        user={confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </>
  );
}

function RowMenu({ user, actor, onEdit, onDelete }) {
  const resetPw = useResetUserPassword();
  const { success, error: toastError } = useToast();
  const isSelf = (user.id ?? user._id) === actor?.id;

  async function handleResetPassword() {
    try {
      await resetPw.mutateAsync(user.id ?? user._id);
      success('Reset email sent', `A temporary password was emailed to ${user.email}.`);
    } catch (err) {
      toastError(
        "Couldn't reset password",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={handleResetPassword}>
          <KeyRound className="mr-2 h-4 w-4" /> Reset password
        </DropdownMenuItem>
        {!isSelf && !user.isPrimary && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Remove
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateUserDialog({ open, onOpenChange, actor }) {
  const create = useCreateUser();
  const { success, error: toastError } = useToast();
  const [preferredSites, setPreferredSites] = useState([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({ defaultValues: { role: 'sponsor', gender: '' } });
  const role = watch('role');
  const gender = watch('gender');

  function resetAll() {
    reset({ role: 'sponsor', gender: '' });
    setPreferredSites([]);
  }

  async function onSubmit(values) {
    try {
      const created = await create.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        dob: values.dob || undefined,
        gender: values.gender || undefined,
        role: values.role,
        preferredSites:
          values.role === 'volunteer' && preferredSites.length ? preferredSites : undefined,
      });
      success('User created', `A temp password was emailed to ${created.user.email}.`);
      resetAll();
      onOpenChange(false);
    } catch (err) {
      toastError(
        "Couldn't create user",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  const canCreateNgoAdmin = !!actor?.isPrimary;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetAll();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new user</DialogTitle>
          <DialogDescription>
            They'll receive an email with a temporary password and be asked to set their own on
            first sign-in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="off"
                disabled={create.isPending}
                {...register('firstName', { required: 'Required' })}
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" disabled={create.isPending} {...register('dob')} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender || undefined} onValueChange={(v) => setValue('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone {role === 'sponsor' ? '' : '(optional)'}
            </Label>
            <Input
              id="phone"
              disabled={create.isPending}
              {...register('phone', {
                required: role === 'sponsor' ? 'Phone is required for sponsors' : false,
              })}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.filter((r) => r !== 'ngo_admin' || canCreateNgoAdmin).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!canCreateNgoAdmin && (
              <p className="text-xs text-muted-foreground">
                Only the primary NGO admin can add other NGO admins.
              </p>
            )}
          </div>

          {role === 'volunteer' && (
            <PreferredSitesPicker
              value={preferredSites}
              onChange={setPreferredSites}
              disabled={create.isPending}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={create.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PreferredSitesPicker({ value, onChange, disabled }) {
  const { data, isLoading } = useSites({ limit: 200 });
  const sites = data?.items ?? [];
  function toggle(id) {
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id]);
  }
  return (
    <div className="space-y-2">
      <Label>
        Preferred site(s) <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-secondary/30 p-2 space-y-1">
        {isLoading ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Loading sites…</p>
        ) : sites.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">No sites yet.</p>
        ) : (
          sites.map((s) => {
            const id = s.id ?? s._id;
            return (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  checked={value.includes(id)}
                  disabled={disabled}
                  onChange={() => toggle(id)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="truncate">{s.name}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function EditUserSheet({ user, onClose, actor }) {
  const update = useUpdateUser();
  const resetPw = useResetUserPassword();
  const { success, error: toastError } = useToast();
  const open = !!user;
  const isSelf = (user?.id ?? user?._id) === actor?.id;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    values: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      dob: user?.dob ? String(user.dob).slice(0, 10) : '',
      gender: user?.gender ?? '',
      phone: user?.phone ?? '',
    },
  });
  const gender = watch('gender');

  if (!user) return null;

  async function onSubmit(values) {
    try {
      // Only send name parts when present — legacy accounts may have just
      // the composite `name` and we don't want to wipe it with blanks.
      const patch = { phone: values.phone?.trim() ?? '' };
      if (values.firstName?.trim()) patch.firstName = values.firstName.trim();
      if (values.lastName?.trim()) patch.lastName = values.lastName.trim();
      if (values.dob) patch.dob = values.dob;
      if (values.gender) patch.gender = values.gender;
      await update.mutateAsync({
        id: user.id ?? user._id,
        patch,
      });
      success('User updated');
      onClose();
    } catch (err) {
      toastError(
        "Couldn't update",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  async function toggleActive() {
    try {
      await update.mutateAsync({
        id: user.id ?? user._id,
        patch: { isActive: !user.isActive },
      });
      success(user.isActive ? 'User deactivated' : 'User reactivated');
      onClose();
    } catch (err) {
      toastError(
        "Couldn't change status",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  async function handleResetPassword() {
    try {
      await resetPw.mutateAsync(user.id ?? user._id);
      success('Reset email sent', `A temporary password was emailed to ${user.email}.`);
    } catch (err) {
      toastError(
        "Couldn't reset password",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          reset();
        }
      }}
    >
      <SheetContent side="right" className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
          <SheetDescription>{user.email}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-5 mt-6">
          <UserSummary user={user} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First name</Label>
              <Input id="edit-firstName" disabled={update.isPending} {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last name</Label>
              <Input id="edit-lastName" disabled={update.isPending} {...register('lastName')} />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-dob">Date of birth</Label>
              <Input id="edit-dob" type="date" disabled={update.isPending} {...register('dob')} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender || undefined} onValueChange={(v) => setValue('gender', v, { shouldDirty: true })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" disabled={update.isPending} {...register('phone')} />
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-3">
            <div className="text-sm font-medium text-foreground">Account actions</div>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={handleResetPassword}
              disabled={resetPw.isPending}
            >
              <KeyRound className="h-4 w-4" /> Email a new temporary password
            </Button>
            {!isSelf && !user.isPrimary && (
              <Button
                type="button"
                variant={user.isActive ? 'outline' : 'default'}
                className={cn(
                  'w-full justify-start',
                  user.isActive && 'text-destructive hover:text-destructive',
                )}
                onClick={toggleActive}
                disabled={update.isPending}
              >
                <UserX className="h-4 w-4" /> {user.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            )}
          </div>

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty || update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function UserSummary({ user }) {
  return (
    <div className="bento-card p-4 space-y-2 surface-biophilic">
      <div className="flex items-center gap-2">
        <RoleBadge role={user.role} />
        {user.isPrimary && <Badge variant="accent">Primary</Badge>}
        {!user.isActive && <Badge variant="muted">Inactive</Badge>}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        {user.email}
      </div>
      {user.phone && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {user.phone}
        </div>
      )}
      {user.createdBy && typeof user.createdBy === 'object' && user.createdBy.name && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Added by{' '}
          <span className="text-foreground font-medium">{user.createdBy.name}</span>
          {user.createdBy.role && (
            <span className="text-muted-foreground/70">
              ({user.createdBy.role.replace('_', ' ')})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteUserConfirm({ user, onClose }) {
  const remove = useDeleteUser();
  const { success, error: toastError } = useToast();

  async function handleConfirm() {
    try {
      await remove.mutateAsync(user.id ?? user._id);
      success('User removed');
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
      open={!!user}
      onOpenChange={(o) => !o && onClose()}
      title={user ? `Remove ${user.name}?` : ''}
      description="They'll lose access immediately. Their historical records (donations, plants, logs) stay intact."
      confirmLabel="Remove user"
      destructive
      busy={remove.isPending}
      onConfirm={handleConfirm}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function ErrorRow({ onRetry }) {
  return (
    <EmptyState
      title="Couldn't load users"
      description="Check your connection and try again."
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  );
}
