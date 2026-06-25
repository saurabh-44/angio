import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ChevronRight,
  Filter,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  UserX,
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
  DropdownMenuLabel,
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
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const ROLE_OPTIONS = ['sponsor', 'site_owner', 'volunteer', 'ngo_admin'];

// Solid role pills, matching the Figma (sponsor blue, site-owner green).
const ROLE_PILL = {
  ngo_admin: { label: 'NGO Admin', cls: 'bg-[#001F00] text-white' },
  site_owner: { label: 'Site Incharge', cls: 'bg-[#0B5000] text-white' },
  sponsor: { label: 'Sponsor', cls: 'bg-[#346EC4] text-white' },
  volunteer: { label: 'Volunteer', cls: 'bg-[#D97706] text-white' },
};
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
const LIMIT = 20;

export default function UsersPage() {
  const { user: actor } = useAuth();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState('');
  const [q, setQ] = useState(searchParams.get('q') ?? '');
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
    <div style={{ fontFamily: BODY_FONT }}>
      <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        Users
      </h1>

      {/* Search + role filter + New User */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B4B4B4]"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="w-full rounded-[10px] border border-[#B4B4B4] py-3.5 pl-12 pr-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
          />
        </div>

        <UserRoleFilter
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        />

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#013300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
        >
          <UserPlus className="h-5 w-5" aria-hidden /> New User
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="mt-10">
          <ErrorRow onRetry={() => refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
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
        </div>
      ) : (
        <>
          {/* Desktop table (lg and up) */}
          <div className="mt-7 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  {['User', 'Role', 'Email ID', 'Enrolled Date'].map((h) => (
                    <th key={h} className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1">
                      {h}
                    </th>
                  ))}
                  <th className="pb-4 text-right text-base font-medium text-[#001F00]">View More</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr
                    key={u.id ?? u._id}
                    onClick={() => setEditing(u)}
                    className="cursor-pointer border-t border-[#E2E8F0] transition-colors hover:bg-[#F6FAF6]"
                  >
                    <td className="py-4 pr-4 first:pl-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#001F00]">{u.name}</span>
                        {u.isPrimary && (
                          <span className="rounded-full bg-[#0B5000]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B5000]">
                            Primary
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-[#1E1E1E]/60">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <RolePill role={u.role} />
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]">{u.email}</td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]">{formatDate(u.createdAt)}</td>
                    <td className="py-4 text-right">
                      <ChevronRight className="ml-auto h-5 w-5 text-[#1E1E1E]/60" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards (below lg) */}
          <div className="mt-7 space-y-3 lg:hidden">
            {items.map((u) => (
              <button
                key={u.id ?? u._id}
                type="button"
                onClick={() => setEditing(u)}
                className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] p-4 text-left transition-colors hover:border-[#001F00]/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#001F00]">{u.name}</span>
                    {u.isPrimary && (
                      <span className="rounded-full bg-[#0B5000]/10 px-2 py-0.5 text-[11px] font-medium text-[#0B5000]">
                        Primary
                      </span>
                    )}
                    {!u.isActive && (
                      <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[11px] font-medium text-[#1E1E1E]/60">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <RolePill role={u.role} />
                    <span className="truncate text-xs text-[#1E1E1E]/60">{u.email}</span>
                  </div>
                  <div className="mt-1 text-xs text-[#1E1E1E]/50">
                    Enrolled {formatDate(u.createdAt)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#1E1E1E]/40" aria-hidden />
              </button>
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} actor={actor} />
      <EditUserSheet
        user={editing}
        onClose={() => setEditing(null)}
        actor={actor}
        onRequestDelete={(u) => {
          setEditing(null);
          setConfirmingDelete(u);
        }}
      />
      <DeleteUserConfirm user={confirmingDelete} onClose={() => setConfirmingDelete(null)} />
    </div>
  );
}

function RolePill({ role }) {
  const meta = ROLE_PILL[role] ?? { label: ROLE_LABEL[role] ?? role, cls: 'bg-[#E2E8F0] text-[#1E1E1E]' };
  return (
    <span className={cn('inline-flex rounded-full px-4 py-1.5 text-sm font-medium', meta.cls)}>
      {meta.label}
    </span>
  );
}

// Filter users by role. Trigger styled like the Figma filter button.
function UserRoleFilter({ value, onChange }) {
  const active = ROLE_PILL[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-2 rounded-[10px] border px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          value
            ? 'border-[#0B5000] text-[#0B5000]'
            : 'border-[#B4B4B4] text-[#1E1E1E] hover:border-[#0B5000]',
        )}
      >
        <Filter className="h-5 w-5" aria-hidden />
        {active && <span>{active.label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Filter by role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange('')}>All roles</DropdownMenuItem>
        {ROLE_OPTIONS.map((r) => (
          <DropdownMenuItem key={r} onClick={() => onChange(r)}>
            {ROLE_PILL[r]?.label ?? ROLE_LABEL[r]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Field styles for the Figma Add-User modal (rounded-10, dark outline).
const USER_FIELD =
  'w-full rounded-[10px] border border-[#1E1E1E] px-5 py-3.5 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#1E1E1E]/55 focus:border-[#0B5000] disabled:opacity-60';
const USER_TRIGGER =
  'h-auto w-full rounded-[10px] border-[#1E1E1E] px-5 py-3.5 text-base text-[#1E1E1E] data-[placeholder]:text-[#1E1E1E]/55 focus:ring-0 focus:ring-offset-0';

// Figma "Add User" — single-column modal. Wires to the same create-user
// mutation, now also carrying an optional admin-set password + assigned site.
function CreateUserDialog({ open, onOpenChange, actor }) {
  const create = useCreateUser();
  const { success, error: toastError } = useToast();
  const [assignSite, setAssignSite] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({ defaultValues: { role: '', gender: '' } });
  const role = watch('role');
  const gender = watch('gender');

  function resetAll() {
    reset({ role: '', gender: '' });
    setAssignSite('');
  }

  async function onSubmit(values) {
    if (!values.role) {
      toastError('Pick a role', 'Choose a role for this user.');
      return;
    }
    try {
      const created = await create.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        dob: values.dob || undefined,
        gender: values.gender || undefined,
        role: values.role,
        password: values.password?.trim() || undefined,
        preferredSites: assignSite ? [assignSite] : undefined,
      });
      success(
        'User created',
        values.password?.trim()
          ? 'They can sign in with the password you set.'
          : `A temp password was emailed to ${created.user.email}.`,
      );
      resetAll();
      onOpenChange(false);
    } catch (err) {
      toastError("Couldn't create user", err instanceof ApiError ? err.message : 'Try again.');
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
      <DialogContent
        className="w-[calc(100vw-1.5rem)] gap-5 rounded-[10px] sm:max-w-[640px]"
        style={{ fontFamily: BODY_FONT }}
      >
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            Add User
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            Fill in all required details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <input
                placeholder="First Name"
                autoComplete="off"
                disabled={create.isPending}
                className={USER_FIELD}
                {...register('firstName', { required: 'Required' })}
              />
              {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div>
              <input
                placeholder="Last Name"
                autoComplete="off"
                disabled={create.isPending}
                className={USER_FIELD}
                {...register('lastName', { required: 'Required' })}
              />
              {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <input
              type="date"
              title="Date of birth"
              disabled={create.isPending}
              className={USER_FIELD}
              {...register('dob')}
            />
            <Select value={gender || undefined} onValueChange={(v) => setValue('gender', v)}>
              <SelectTrigger className={USER_TRIGGER}>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <input
              type="email"
              placeholder="Email ID"
              autoComplete="off"
              disabled={create.isPending}
              className={USER_FIELD}
              {...register('email', {
                required: 'Required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div>
            <input
              placeholder={`Phone Number${role === 'sponsor' ? '' : ' (optional)'}`}
              disabled={create.isPending}
              className={USER_FIELD}
              {...register('phone', {
                required: role === 'sponsor' ? 'Phone is required for sponsors' : false,
              })}
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>

          <div>
            <input
              type="password"
              placeholder="Create Password (optional — else we email one)"
              autoComplete="new-password"
              disabled={create.isPending}
              className={USER_FIELD}
              {...register('password', {
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Select value={role || undefined} onValueChange={(v) => setValue('role', v)}>
              <SelectTrigger className={USER_TRIGGER}>
                <SelectValue placeholder="Assign Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.filter((r) => r !== 'ngo_admin' || canCreateNgoAdmin).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_PILL[r]?.label ?? ROLE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <UserSiteSelect value={assignSite} onChange={setAssignSite} disabled={create.isPending} />
          </div>

          {!canCreateNgoAdmin && (
            <p className="text-xs text-[#1E1E1E]/50">
              Only the primary NGO admin can add other NGO admins.
            </p>
          )}

          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add User
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Single-site picker for "Assign Site".
function UserSiteSelect({ value, onChange, disabled }) {
  const { data, isLoading } = useSites({ limit: 200 });
  const sites = data?.items ?? [];
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={USER_TRIGGER}>
        <SelectValue placeholder={isLoading ? 'Loading…' : 'Assign Site'} />
      </SelectTrigger>
      <SelectContent>
        {sites.length === 0 && !isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">No sites yet.</div>
        ) : (
          sites.map((s) => (
            <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>
              {s.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function EditUserSheet({ user, onClose, actor, onRequestDelete }) {
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
      <SheetContent side="right" className="flex flex-col sm:max-w-xl" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            Edit user
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">{user.email}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 -mx-2 flex-1 space-y-5 overflow-y-auto px-2">
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

          <div className="space-y-3 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-4">
            <div className="text-sm font-medium text-[#001F00]">Account actions</div>
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
            {!isSelf && !user.isPrimary && onRequestDelete && (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => onRequestDelete(user)}
                disabled={update.isPending}
              >
                <Trash2 className="h-4 w-4" /> Remove user
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
    <div className="space-y-2 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RolePill role={user.role} />
        {user.isPrimary && (
          <span className="rounded-full bg-[#0B5000]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#0B5000]">
            Primary
          </span>
        )}
        {!user.isActive && (
          <span className="rounded-full bg-[#E2E8F0] px-2.5 py-0.5 text-[11px] font-medium text-[#1E1E1E]/60">
            Inactive
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm text-[#1E1E1E]/70">
        <Mail className="h-3.5 w-3.5" aria-hidden />
        {user.email}
      </div>
      {user.phone && (
        <div className="flex items-center gap-2 text-sm text-[#1E1E1E]/70">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          {user.phone}
        </div>
      )}
      {user.createdBy && typeof user.createdBy === 'object' && user.createdBy.name && (
        <div className="flex items-center gap-2 text-sm text-[#1E1E1E]/70">
          <UserPlus className="h-3.5 w-3.5" aria-hidden />
          Added by <span className="font-medium text-[#001F00]">{user.createdBy.name}</span>
          {user.createdBy.role && (
            <span className="text-[#1E1E1E]/50">({user.createdBy.role.replace('_', ' ')})</span>
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
