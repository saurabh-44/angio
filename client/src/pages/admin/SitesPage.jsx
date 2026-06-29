import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Check,
  Filter,
  ImagePlus,
  Loader2,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
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
import { openAuthedPdf } from '@/lib/nativeFile.js';
import {
  useCreateSite,
  useDeleteSite,
  useSites,
  useUpdateSite,
} from '@/queries/sites.js';
import { useUsers } from '@/queries/users.js';
import { uploadPhoto } from '@/queries/uploads.js';
import { useAuth } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { formatAmount, formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

const LIMIT = 12;

// Figma sites panel — a card grid (replacing the old table). Each card shows
// the site name + incharge/capacity/price/created, with a 3px brand-green
// foot accent. All data + actions (create / edit / QR / delete) are unchanged.
export default function SitesPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const canCreate = role === 'ngo_admin';
  const canDelete = role === 'ngo_admin';

  const [q, setQ] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading, isError, refetch } = useSites({
    q: q || undefined,
    owner: ownerFilter || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  async function printQrSheet(site) {
    const id = site.id ?? site._id;
    try {
      await openAuthedPdf(`/api/sites/${id}/qr-sheet.pdf`, `qr-sheet-${id}.pdf`);
    } catch (err) {
      toastError('Could not open QR sheet', err?.message ?? 'Please try again.');
    }
  }

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          {canCreate ? 'Sites' : 'My sites'}
        </h1>
      </PageHeading>

      {/* Search + filter + New Site */}
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
            placeholder="Search by name or address…"
            className="w-full rounded-[10px] border border-[#B4B4B4] py-3.5 pl-12 pr-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
          />
        </div>

        {canCreate && (
          <SiteOwnerFilter
            value={ownerFilter}
            onChange={(v) => {
              setOwnerFilter(v);
              setPage(1);
            }}
          />
        )}

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#013300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
          >
            <MapPin className="h-5 w-5" aria-hidden /> New Site
          </button>
        )}
      </div>

      {isLoading ? (
        <GridSkeleton />
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load sites"
            description="Check your connection and try again."
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
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
        </div>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-1 justify-start gap-6 sm:grid-cols-[repeat(auto-fill,minmax(300px,374px))]">
            {items.map((s) => (
              <SiteCard
                key={s.id ?? s._id}
                site={s}
                onOpen={() => navigate(`${s.id ?? s._id}`)}
                onEdit={() => setEditing(s)}
                onPrintQr={() => printQrSheet(s)}
                onDelete={canDelete ? () => setConfirmingDelete(s) : null}
              />
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <SiteFormDialog mode="create" open={createOpen} onOpenChange={setCreateOpen} />
      <SiteFormSheet site={editing} onClose={() => setEditing(null)} />
      <DeleteSiteConfirm site={confirmingDelete} onClose={() => setConfirmingDelete(null)} />
    </div>
  );
}

// One site card: image-placeholder header + name + a few labelled rows, with a
// 3px green foot accent. The whole card opens the edit sheet; a ⋯ menu carries
// the secondary actions (QR sheet, remove).
function SiteCard({ site, onOpen, onEdit, onPrintQr, onDelete }) {
  return (
    <div className="group relative overflow-hidden rounded-[10px] border-b-[3px] border-[#001F00] bg-white shadow-[0_0_25px_rgba(0,0,0,0.10)] transition-shadow hover:shadow-[0_0_30px_rgba(0,0,0,0.16)]">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#0B5000]/12 to-[#F6FAF6]">
          {site.photo?.url ? (
            <img
              src={site.photo.url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <MapPin className="h-10 w-10 text-[#0B5000]/35" aria-hidden />
            </div>
          )}
        </div>
      </button>

      <div className="absolute right-2.5 top-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#1E1E1E] shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <MoreVertical className="h-4 w-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={onPrintQr}>
              <Printer className="mr-2 h-4 w-4" /> Print QR sheet
            </DropdownMenuItem>
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button type="button" onClick={onOpen} className="block w-full px-4 pb-4 pt-4 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-base font-bold text-[#0B5000]" title={site.name}>
            {site.name}
          </span>
          <span className="shrink-0 rounded-full bg-[#0B5000]/10 px-2.5 py-1 text-[11px] font-medium text-[#0B5000]">
            {site.capacity ? `Capacity ${site.capacity}` : 'Unlimited'}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <SiteRow label="Site Incharge" value={site.owner?.name ?? '—'} />
          <SiteRow label="Total Volunteers" value={String(site.volunteerCount ?? 0)} />
          <SiteRow
            label="Price / tree"
            value={site.pricePerTreeInr != null ? formatAmount(site.pricePerTreeInr) : 'Default'}
          />
          <SiteRow label="Created On" value={formatDate(site.createdAt)} />
          <SiteRow label="Last Update" value={formatDate(site.updatedAt)} />
        </div>
      </button>
    </div>
  );
}

function SiteRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-[#1E1E1E]/70">{label}</span>
      <span className="truncate text-xs font-medium text-[#1E1E1E]">{value}</span>
    </div>
  );
}

// Filter sites by their incharge (site owner). Reuses the existing `owner`
// query param — no backend change.
function SiteOwnerFilter({ value, onChange }) {
  const { data } = useUsers({ role: 'site_owner', limit: 100 });
  const owners = data?.items ?? [];
  const active = owners.find((o) => (o.id ?? o._id) === value);
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
        {active && <span className="max-w-[120px] truncate">{active.name}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Filter by incharge</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange('')}>All incharges</DropdownMenuItem>
        {owners.map((o) => (
          <DropdownMenuItem key={o.id ?? o._id} onClick={() => onChange(o.id ?? o._id)}>
            {o.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-7 grid grid-cols-1 justify-start gap-6 sm:grid-cols-[repeat(auto-fill,minmax(300px,374px))]">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[360px] rounded-[10px]" />
      ))}
    </div>
  );
}

// Reusable owner picker that loads only site_owner-role users.
function OwnerSelect({ value, onChange, disabled, triggerClassName, placeholder }) {
  const { data, isLoading } = useUsers({ role: 'site_owner', limit: 100 });
  const owners = data?.items ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={isLoading ? 'Loading owners…' : (placeholder ?? 'Choose a site owner')} />
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

function SiteFormFields({
  register,
  errors,
  owner,
  setOwner,
  disabled,
  onUseMyLocation,
  geoBusy,
  photo,
  setPhoto,
}) {
  return (
    <>
      {setPhoto && (
        <div className="space-y-2">
          <Label>Photo</Label>
          <SitePhotoUpload photo={photo} onChange={setPhoto} disabled={disabled} />
        </div>
      )}
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

// Styled text field matching the Figma (rounded-10, grey outline, focuses to
// brand green). `filled` paints the outline dark-green like the design's
// active Site-Name field.
const fieldCls = (filled) =>
  cn(
    'w-full rounded-[10px] border border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]',
    filled ? 'border-[#001F00]' : 'border-[#B4B4B4]',
  );

// Site cover-photo dropzone (Cloudinary signed upload). Shows a preview once
// uploaded; the ⨯ clears it.
function SitePhotoUpload({ photo, onChange, disabled }) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadPhoto(file, { purpose: 'site' });
      onChange({ url: uploaded.url, publicId: uploaded.publicId });
    } catch (err) {
      toastError('Upload failed', err?.message ?? 'Try a different image.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={cn(
        'relative flex h-[220px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-[#B4B4B4] bg-[#F6FAF6] transition-colors hover:border-[#0B5000]',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      {photo?.url ? (
        <>
          <img src={photo.url} alt="" className="h-full w-full object-cover" />
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-[#1E1E1E] shadow-sm hover:bg-white"
          >
            <X className="h-4 w-4" />
          </span>
        </>
      ) : busy ? (
        <Loader2 className="h-6 w-6 animate-spin text-[#0B5000]" />
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-[#B4B4B4]">
          <ImagePlus className="h-7 w-7" aria-hidden />
          <span className="text-sm">Add site photo</span>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onPick}
        disabled={disabled || busy}
      />
    </label>
  );
}

// Multi-select of volunteer-role users; emits an array of ids. Selected
// volunteers become planting assignments when the site is created.
function VolunteerMultiSelect({ value, onChange, disabled }) {
  const { data } = useUsers({ role: 'volunteer', limit: 200 });
  const vols = data?.items ?? [];
  const selected = new Set(value);
  const byId = new Map(vols.map((v) => [v.id ?? v._id, v]));

  function toggle(id) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-[10px] border border-[#B4B4B4] px-5 py-3.5 text-base text-[#B4B4B4] outline-none transition-colors hover:border-[#0B5000] focus-visible:border-[#0B5000] disabled:opacity-60"
        >
          <span className={value.length ? 'text-[#1E1E1E]' : ''}>
            {value.length
              ? `${value.length} volunteer${value.length === 1 ? '' : 's'} selected`
              : 'Add Volunteers'}
          </span>
          <Plus className="h-5 w-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
        >
          {vols.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No volunteers yet.
            </div>
          ) : (
            vols.map((v) => {
              const id = v.id ?? v._id;
              const on = selected.has(id);
              return (
                <DropdownMenuItem
                  key={id}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggle(id);
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn('h-4 w-4 text-[#0B5000]', on ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="truncate">{v.name}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[#0B5000]/10 px-3 py-1 text-xs text-[#0B5000]"
            >
              {byId.get(id)?.name ?? 'Volunteer'}
              <button
                type="button"
                onClick={() => toggle(id)}
                className="hover:text-[#001F00]"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Figma "Create New Site" — a wide 2-column modal. Left: identity + address.
// Right: cover photo, capacity, volunteers, submit. Wires to the same
// create-site mutation (now also carrying photo + volunteers).
function SiteFormDialog({ open, onOpenChange }) {
  const create = useCreateSite();
  const { success, error: toastError, info } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm();
  const [owner, setOwner] = useState('');
  const [photo, setPhoto] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [geoBusy, setGeoBusy] = useState(false);

  const name = watch('name');
  const lat = watch('lat');
  const lng = watch('lng');
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);

  function close() {
    onOpenChange(false);
    reset({});
    setOwner('');
    setPhoto(null);
    setVolunteers([]);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      info('Location is optional', 'No GPS here — just type the address (and coordinates if you have them).');
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
        info('Location skipped', "It's optional — type the address manually, or allow location access to auto-fill.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function onSubmit(values) {
    if (!owner) {
      toastError('Pick a Site Incharge', 'Choose the site incharge before saving.');
      return;
    }
    try {
      // Coordinates are optional — an off-site admin can save with just the
      // address and add precise GPS later (or type it in if they have it).
      const hasCoords = Number.isFinite(values.lat) && Number.isFinite(values.lng);
      await create.mutateAsync({
        name: values.name.trim(),
        address: values.address?.trim() || undefined,
        city: values.city?.trim() || undefined,
        state: values.state?.trim() || undefined,
        country: values.country?.trim() || undefined,
        pinCode: values.pinCode?.trim() || undefined,
        geo: hasCoords ? { lat: values.lat, lng: values.lng } : undefined,
        capacity: values.capacity || 0,
        pricePerTreeInr: Number.isFinite(values.pricePerTreeInr) ? values.pricePerTreeInr : undefined,
        owner,
        photo: photo ? { url: photo.url, publicId: photo.publicId } : undefined,
        volunteers: volunteers.length ? volunteers : undefined,
      });
      success('Site added');
      close();
    } catch (err) {
      toastError("Couldn't create site", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-[1000px] gap-5 rounded-[10px] border-b-4 border-b-[#001F00] p-7 sm:p-9"
        style={{ fontFamily: BODY_FONT }}
      >
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            Create New Site
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            Fill in all required details
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-7 lg:grid-cols-[1fr_343px]"
          noValidate
        >
          {/* Left — identity + address */}
          <div className="space-y-5">
            <div>
              <input
                placeholder="Site Name"
                disabled={create.isPending}
                className={fieldCls(!!name)}
                {...register('name', { required: 'Required' })}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <OwnerSelect
              value={owner}
              onChange={setOwner}
              disabled={create.isPending}
              placeholder="Add Site Incharge"
              triggerClassName="h-auto w-full rounded-[10px] border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] data-[placeholder]:text-[#B4B4B4] focus:ring-0 focus:ring-offset-0"
            />

            <button
              type="button"
              onClick={useMyLocation}
              disabled={create.isPending || geoBusy}
              className={cn(fieldCls(hasLocation), 'flex items-center justify-between text-left')}
            >
              <span className={hasLocation ? 'text-[#1E1E1E]' : 'text-[#B4B4B4]'}>
                {hasLocation ? `${lat}, ${lng}` : 'Add Location (optional · use my location)'}
              </span>
              {geoBusy ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#0B5000]" />
              ) : (
                <Navigation className="h-5 w-5 text-[#B4B4B4]" aria-hidden />
              )}
            </button>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                step="any"
                placeholder="Latitude"
                disabled={create.isPending}
                className={fieldCls(false)}
                {...register('lat', { valueAsNumber: true })}
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude"
                disabled={create.isPending}
                className={fieldCls(false)}
                {...register('lng', { valueAsNumber: true })}
              />
            </div>

            <input
              placeholder="Address"
              disabled={create.isPending}
              className={fieldCls(false)}
              {...register('address')}
            />
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Country" disabled={create.isPending} className={fieldCls(false)} {...register('country')} />
              <input placeholder="State" disabled={create.isPending} className={fieldCls(false)} {...register('state')} />
              <input placeholder="City" disabled={create.isPending} className={fieldCls(false)} {...register('city')} />
              <input placeholder="PinCode" disabled={create.isPending} className={fieldCls(false)} {...register('pinCode')} />
            </div>
          </div>

          {/* Right — photo, capacity, volunteers, submit */}
          <div className="flex flex-col gap-5">
            <SitePhotoUpload photo={photo} onChange={setPhoto} disabled={create.isPending} />
            <input
              type="number"
              min="0"
              placeholder="Maximum Plantation Capacity"
              disabled={create.isPending}
              className={fieldCls(false)}
              {...register('capacity', { valueAsNumber: true, min: 0 })}
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Price per Tree (₹) — blank = default"
              disabled={create.isPending}
              className={fieldCls(false)}
              {...register('pricePerTreeInr', { valueAsNumber: true, min: 0 })}
            />
            <VolunteerMultiSelect
              value={volunteers}
              onChange={setVolunteers}
              disabled={create.isPending}
            />
            <button
              type="submit"
              disabled={create.isPending}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Site
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SiteFormSheet({ site, onClose }) {
  const update = useUpdateSite();
  const { success, error: toastError, info } = useToast();
  const open = !!site;
  const initial = useMemo(
    () => ({
      name: site?.name ?? '',
      address: site?.address ?? '',
      city: site?.city ?? '',
      state: site?.state ?? '',
      country: site?.country ?? '',
      pinCode: site?.pinCode ?? '',
      lat: site?.geo?.lat ?? '',
      lng: site?.geo?.lng ?? '',
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
  const [photo, setPhoto] = useState(null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  // Sync owner + photo whenever a different site is opened.
  useMemo(() => {
    setOwner(site?.owner?.id ?? site?.owner?._id ?? site?.owner ?? '');
    setPhoto(site?.photo ? { url: site.photo.url, publicId: site.photo.publicId } : null);
    setPhotoDirty(false);
  }, [site]);

  function handlePhoto(next) {
    setPhoto(next);
    setPhotoDirty(true);
  }

  function close() {
    onClose();
    reset();
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      info('Location is optional', 'No GPS here — just type the address (and coordinates if you have them).');
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
        info('Location skipped', "It's optional — type the address manually, or allow location access to auto-fill.");
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
          geo:
            Number.isFinite(values.lat) && Number.isFinite(values.lng)
              ? { lat: values.lat, lng: values.lng }
              : undefined,
          photo: photo ? { url: photo.url, publicId: photo.publicId } : null,
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
            photo={photo}
            setPhoto={handlePhoto}
          />

          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={update.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={(!isDirty && !photoDirty) || update.isPending}>
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
  const { success, error: toastError, info } = useToast();

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
