import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
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
import {
  useCreateSite,
  useDeleteSite,
  useSites,
  useUpdateSite,
} from '@/queries/sites.js';
import { useUsers } from '@/queries/users.js';
import { useAuth } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { formatAmount, formatDate, formatGeo } from '@/lib/format.js';

const LIMIT = 20;

export default function SitesPage() {
  const { role } = useAuth();
  const canCreate = role === 'ngo_admin';
  const canDelete = role === 'ngo_admin';
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading, isError, refetch } = useSites({
    q: q || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={canCreate ? 'Land & sites' : 'My land'}
        title={canCreate ? 'Sites' : 'My sites'}
        description={
          canCreate
            ? 'Empty plots where trees get planted. Each site has an owner who manages volunteers there.'
            : 'The plots you manage. Update details or refresh GPS as planting progresses.'
        }
        actions={
          canCreate && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add site
            </Button>
          )
        }
      />

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or address"
            className="pl-10"
          />
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            title="Couldn't load sites"
            description="Check your connection and try again."
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={q ? 'No matches' : canCreate ? 'No sites yet' : 'No sites assigned to you'}
            description={
              q
                ? 'Try clearing the search.'
                : canCreate
                  ? 'Add a planting site to assign volunteers and start tracking trees.'
                  : 'The NGO will assign you to a site soon.'
            }
            action={
              canCreate && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Add site
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Site</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Price/tree</TableHead>
                  <TableHead>Coords</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow
                    key={s.id ?? s._id}
                    className="cursor-pointer"
                    onClick={() => setEditing(s)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{s.name}</div>
                      {s.address && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                          {s.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.owner?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.owner?.email ?? ''}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">
                      {s.capacity ? s.capacity : '∞'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.pricePerTreeInr != null ? formatAmount(s.pricePerTreeInr) : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatGeo(s.geo)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(s)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              // window.open over a navigation so the PDF
                              // opens in a new tab and the user stays on
                              // the sites list. Cookies travel because the
                              // /api path is same-origin (Vite proxy).
                              window.open(
                                `/api/sites/${s.id ?? s._id}/qr-sheet.pdf`,
                                '_blank',
                                'noopener,noreferrer',
                              );
                            }}
                          >
                            <Printer className="mr-2 h-4 w-4" /> Print QR sheet
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmingDelete(s)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <SiteFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <SiteFormSheet
        site={editing}
        onClose={() => setEditing(null)}
      />
      <DeleteSiteConfirm
        site={confirmingDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </>
  );
}

// Reusable owner picker that loads only site_owner-role users.
function OwnerSelect({ value, onChange, disabled }) {
  const { data, isLoading } = useUsers({ role: 'site_owner', limit: 100 });
  const owners = data?.items ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading owners…' : 'Choose a site owner'} />
      </SelectTrigger>
      <SelectContent>
        {owners.length === 0 && !isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No site owners yet. Add one from Users first.
          </div>
        ) : (
          owners.map((o) => (
            <SelectItem key={o.id ?? o._id} value={o.id ?? o._id}>
              {o.name} <span className="text-muted-foreground">· {o.email}</span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function SiteFormFields({ register, errors, owner, setOwner, disabled, onUseMyLocation, geoBusy }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="site-name">Name</Label>
        <Input
          id="site-name"
          placeholder="e.g. Eastern slope, Plot B"
          disabled={disabled}
          {...register('name', { required: 'Required' })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-address">Address</Label>
        <Input
          id="site-address"
          placeholder="Optional — village, district, etc."
          disabled={disabled}
          {...register('address')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="site-city">City</Label>
          <Input id="site-city" placeholder="City" disabled={disabled} {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-state">State</Label>
          <Input id="site-state" placeholder="State" disabled={disabled} {...register('state')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="site-country">Country</Label>
          <Input id="site-country" placeholder="Country" disabled={disabled} {...register('country')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-pin">PIN code</Label>
          <Input id="site-pin" placeholder="PIN / ZIP" disabled={disabled} {...register('pinCode')} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Coordinates</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onUseMyLocation}
            disabled={disabled || geoBusy}
          >
            {geoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            Use my location
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              type="number"
              step="any"
              placeholder="Latitude"
              disabled={disabled}
              {...register('lat', {
                required: 'Required',
                valueAsNumber: true,
                min: { value: -90, message: '−90 to 90' },
                max: { value: 90, message: '−90 to 90' },
              })}
            />
            {errors.lat && <p className="text-xs text-destructive mt-1">{errors.lat.message}</p>}
          </div>
          <div>
            <Input
              type="number"
              step="any"
              placeholder="Longitude"
              disabled={disabled}
              {...register('lng', {
                required: 'Required',
                valueAsNumber: true,
                min: { value: -180, message: '−180 to 180' },
                max: { value: 180, message: '−180 to 180' },
              })}
            />
            {errors.lng && <p className="text-xs text-destructive mt-1">{errors.lng.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="site-capacity">Capacity</Label>
          <Input
            id="site-capacity"
            type="number"
            min="0"
            placeholder="0 = unlimited"
            disabled={disabled}
            {...register('capacity', { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-price">Price per tree (₹)</Label>
          <Input
            id="site-price"
            type="number"
            min="0"
            step="any"
            placeholder="Blank = default price"
            disabled={disabled}
            {...register('pricePerTreeInr', { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Owner</Label>
        <OwnerSelect value={owner} onChange={setOwner} disabled={disabled} />
      </div>
    </>
  );
}

function SiteFormDialog({ open, onOpenChange }) {
  const create = useCreateSite();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({ defaultValues: { capacity: 0 } });
  const [owner, setOwner] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);

  function close() {
    onOpenChange(false);
    reset({ capacity: 0 });
    setOwner('');
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toastError('Geolocation unavailable', 'Your browser does not support GPS.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', Number(pos.coords.latitude.toFixed(6)), { shouldDirty: true });
        setValue('lng', Number(pos.coords.longitude.toFixed(6)), { shouldDirty: true });
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        toastError("Couldn't read GPS", err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function onSubmit(values) {
    if (!owner) {
      toastError('Pick an owner', 'Choose the site owner before saving.');
      return;
    }
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        state: values.state?.trim() || undefined,
        country: values.country?.trim() || undefined,
        pinCode: values.pinCode?.trim() || undefined,
        geo: { lat: values.lat, lng: values.lng },
        capacity: values.capacity || 0,
        pricePerTreeInr: Number.isFinite(values.pricePerTreeInr) ? values.pricePerTreeInr : undefined,
        owner,
      });
      success('Site added');
      close();
    } catch (err) {
      toastError(
        "Couldn't create site",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New site</DialogTitle>
          <DialogDescription>
            Pin the location on the map by GPS or type the coordinates manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <SiteFormFields
            register={register}
            errors={errors}
            owner={owner}
            setOwner={setOwner}
            disabled={create.isPending}
            onUseMyLocation={useMyLocation}
            geoBusy={geoBusy}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add site
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteFormSheet({ site, onClose }) {
  const update = useUpdateSite();
  const { success, error: toastError } = useToast();
  const open = !!site;
  const initial = useMemo(
    () => ({
      name: site?.name ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      state: site?.state ?? '',
      country: site?.country ?? '',
      pinCode: site?.pinCode ?? '',
      lat: site?.geo?.lat ?? 0,
      lng: site?.geo?.lng ?? 0,
      capacity: site?.capacity ?? 0,
      pricePerTreeInr: site?.pricePerTreeInr ?? '',
    }),
    [site],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
  } = useForm({ values: initial });
  const [owner, setOwner] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);

  // Sync owner whenever a different site is opened.
  useMemo(() => {
    setOwner(site?.owner?.id ?? site?.owner?._id ?? site?.owner ?? '');
  }, [site]);

  function close() {
    onClose();
    reset();
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toastError('Geolocation unavailable', 'Your browser does not support GPS.');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('lat', Number(pos.coords.latitude.toFixed(6)), { shouldDirty: true });
        setValue('lng', Number(pos.coords.longitude.toFixed(6)), { shouldDirty: true });
        setGeoBusy(false);
      },
      (err) => {
        setGeoBusy(false);
        toastError("Couldn't read GPS", err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function onSubmit(values) {
    try {
      await update.mutateAsync({
        id: site.id ?? site._id,
        patch: {
          name: values.name.trim(),
          address: values.address?.trim() ?? '',
          city: values.city?.trim() ?? '',
          state: values.state?.trim() ?? '',
          country: values.country?.trim() ?? '',
          pinCode: values.pinCode?.trim() ?? '',
          geo: { lat: values.lat, lng: values.lng },
          capacity: values.capacity || 0,
          pricePerTreeInr: Number.isFinite(values.pricePerTreeInr) ? values.pricePerTreeInr : undefined,
          owner: owner || undefined,
        },
      });
      success('Site updated');
      close();
    } catch (err) {
      toastError(
        "Couldn't update site",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  if (!site) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit site</SheetTitle>
          <SheetDescription>{site.name}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4 mt-6 overflow-y-auto pr-1">
          <SiteFormFields
            register={register}
            errors={errors}
            owner={owner}
            setOwner={setOwner}
            disabled={update.isPending}
            onUseMyLocation={useMyLocation}
            geoBusy={geoBusy}
          />

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={update.isPending}>
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

function DeleteSiteConfirm({ site, onClose }) {
  const remove = useDeleteSite();
  const { success, error: toastError } = useToast();

  async function handleConfirm() {
    try {
      await remove.mutateAsync(site.id ?? site._id);
      success('Site removed');
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
      open={!!site}
      onOpenChange={(o) => !o && onClose()}
      title={site ? `Remove ${site.name}?` : ''}
      description="Plants and historical logs for this site remain in the system."
      confirmLabel="Remove site"
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
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
