import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChevronRight, Leaf, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
import ConfirmDialog from '@/components/ConfirmDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
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
import { useToast } from '@/components/ui/toast.jsx';
import {
  useCreateSpecies,
  useDeleteSpecies,
  useSpeciesList,
  useUpdateSpecies,
} from '@/queries/species.js';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

const LIMIT = 20;

// Field styling matching the new modal pattern (rounded-10, dark outline).
const FIELD =
  'w-full rounded-[10px] border border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000] disabled:opacity-60';

export default function SpeciesPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading, isError, refetch } = useSpeciesList({
    q: q || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <PageHeading>
        <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
          Species
        </h1>
        <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
          Tree species your volunteers can pick from. Each species can carry its own CO₂ absorption
          rate for more accurate estimates.
        </p>
      </PageHeading>

      {/* Search + Add species */}
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
            placeholder="Search by name…"
            className="w-full rounded-[10px] border border-[#B4B4B4] py-3.5 pl-12 pr-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3.5 text-sm font-medium text-white transition-colors hover:bg-[#013300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" aria-hidden /> Add species
        </button>
      </div>

      {isLoading ? (
        <div className="mt-7 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load species"
            description="Check your connection and try again."
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Leaf}
            title={q ? 'No matches' : 'No species yet'}
            description={
              q
                ? 'Try clearing the search.'
                : 'Add the species your NGO plants so volunteers can pick from a dropdown.'
            }
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#013300]"
              >
                <Plus className="h-4 w-4" aria-hidden /> Add species
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-7 hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  {['Name', 'Scientific name', 'CO₂ / year', 'Status', 'Added'].map((h) => (
                    <th key={h} className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1">
                      {h}
                    </th>
                  ))}
                  <th className="pb-4 text-right text-base font-medium text-[#001F00]">View More</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id ?? s._id}
                    onClick={() => setEditing(s)}
                    className="cursor-pointer border-t border-[#E2E8F0] transition-colors hover:bg-[#F6FAF6]"
                  >
                    <td className="py-4 pr-4 first:pl-1">
                      <div className="font-medium text-[#001F00]">{s.name}</div>
                      {s.description && (
                        <div className="mt-0.5 line-clamp-1 max-w-md text-xs text-[#1E1E1E]/50">
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-sm italic text-[#1E1E1E]/50">
                      {s.scientificName || '—'}
                    </td>
                    <td className="py-4 pr-4 font-mono text-sm tabular-nums text-[#1E1E1E]">
                      {s.co2PerYearKg != null ? `${s.co2PerYearKg} kg` : '—'}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                          s.isActive
                            ? 'bg-[#0B5000]/10 text-[#0B5000]'
                            : 'bg-[#E2E8F0] text-[#1E1E1E]/60',
                        )}
                      >
                        {s.isActive ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]/60">{formatDate(s.createdAt)}</td>
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
            {items.map((s) => (
              <button
                key={s.id ?? s._id}
                type="button"
                onClick={() => setEditing(s)}
                className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] p-4 text-left transition-colors hover:border-[#001F00]/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#001F00]">{s.name}</span>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                        s.isActive ? 'bg-[#0B5000]/10 text-[#0B5000]' : 'bg-[#E2E8F0] text-[#1E1E1E]/60',
                      )}
                    >
                      {s.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  {s.scientificName && (
                    <div className="mt-0.5 truncate text-xs italic text-[#1E1E1E]/50">
                      {s.scientificName}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-[#1E1E1E]/60">
                    {s.co2PerYearKg != null ? `${s.co2PerYearKg} kg CO₂/yr` : 'Default rate'} · Added{' '}
                    {formatDate(s.createdAt)}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#1E1E1E]/40" aria-hidden />
              </button>
            ))}
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <SpeciesFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SpeciesFormSheet
        species={editing}
        onClose={() => setEditing(null)}
        onRequestDelete={(s) => {
          setEditing(null);
          setConfirmingDelete(s);
        }}
      />
      <DeleteSpeciesConfirm species={confirmingDelete} onClose={() => setConfirmingDelete(null)} />
    </div>
  );
}

function SpeciesFormFields({ register, errors, isActive, setIsActive, disabled }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="species-name" className="text-[#001F00]">Common name</Label>
        <input
          id="species-name"
          className={FIELD}
          placeholder="e.g. Neem, Banyan, Mango"
          disabled={disabled}
          {...register('name', { required: 'Required', maxLength: 120 })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-sci" className="text-[#001F00]">Scientific name</Label>
        <input
          id="species-sci"
          className={FIELD}
          placeholder="Optional — e.g. Azadirachta indica"
          disabled={disabled}
          {...register('scientificName', { maxLength: 180 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-co2" className="text-[#001F00]">CO₂ absorption (kg / year)</Label>
        <input
          id="species-co2"
          type="number"
          step="0.1"
          min="0"
          className={FIELD}
          placeholder="e.g. 22"
          disabled={disabled}
          {...register('co2PerYearKg', { valueAsNumber: true, min: 0 })}
        />
        <p className="text-xs text-[#1E1E1E]/50">
          Leave blank to use the default rate of 22 kg/year.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="species-height" className="text-[#001F00]">Max height (cm)</Label>
          <input
            id="species-height"
            type="number"
            min="0"
            className={FIELD}
            placeholder="Optional"
            disabled={disabled}
            {...register('maxHeightCm', { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="species-dbh" className="text-[#001F00]">Max trunk Ø (cm)</Label>
          <input
            id="species-dbh"
            type="number"
            min="0"
            className={FIELD}
            placeholder="Optional"
            disabled={disabled}
            {...register('maxDbhCm', { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-desc" className="text-[#001F00]">Description</Label>
        <textarea
          id="species-desc"
          rows={3}
          placeholder="Optional notes about the species"
          disabled={disabled}
          className="w-full resize-y rounded-[10px] border border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000] disabled:opacity-60"
          {...register('description', { maxLength: 2000 })}
        />
      </div>

      <div className="flex items-center justify-between rounded-[10px] border border-[#E2E8F0] p-4">
        <div>
          <Label className="text-sm text-[#001F00]">Active</Label>
          <p className="text-xs text-[#1E1E1E]/50">
            Inactive species are hidden from the volunteer dropdown.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          disabled={disabled}
          onClick={() => setIsActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            isActive ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
              isActive ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </>
  );
}

function SpeciesFormDialog({ open, onOpenChange }) {
  const create = useCreateSpecies();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const [isActive, setIsActive] = useState(true);

  function close() {
    onOpenChange(false);
    reset();
    setIsActive(true);
  }

  async function onSubmit(values) {
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        scientificName: values.scientificName?.trim() || undefined,
        co2PerYearKg: Number.isFinite(values.co2PerYearKg) ? values.co2PerYearKg : undefined,
        maxHeightCm: Number.isFinite(values.maxHeightCm) ? values.maxHeightCm : undefined,
        maxDbhCm: Number.isFinite(values.maxDbhCm) ? values.maxDbhCm : undefined,
        description: values.description?.trim() || undefined,
        isActive,
      });
      success('Species added');
      close();
    } catch (err) {
      toastError(
        "Couldn't create species",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="rounded-[10px] sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            New species
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            A new entry shows up immediately in the volunteer's species picker.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <SpeciesFormFields
            register={register}
            errors={errors}
            isActive={isActive}
            setIsActive={setIsActive}
            disabled={create.isPending}
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add species
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpeciesFormSheet({ species, onClose, onRequestDelete }) {
  const update = useUpdateSpecies();
  const { success, error: toastError } = useToast();
  const open = !!species;
  const initial = useMemo(
    () => ({
      name: species?.name ?? '',
      scientificName: species?.scientificName ?? '',
      co2PerYearKg: species?.co2PerYearKg ?? '',
      maxHeightCm: species?.maxHeightCm ?? '',
      maxDbhCm: species?.maxDbhCm ?? '',
      description: species?.description ?? '',
    }),
    [species],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({ values: initial });
  const [isActive, setIsActive] = useState(true);

  useMemo(() => {
    setIsActive(species?.isActive ?? true);
  }, [species]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values) {
    try {
      await update.mutateAsync({
        id: species.id ?? species._id,
        patch: {
          name: values.name.trim(),
          scientificName: values.scientificName?.trim() ?? '',
          co2PerYearKg:
            values.co2PerYearKg === '' || values.co2PerYearKg == null
              ? undefined
              : Number(values.co2PerYearKg),
          maxHeightCm:
            values.maxHeightCm === '' || values.maxHeightCm == null
              ? undefined
              : Number(values.maxHeightCm),
          maxDbhCm:
            values.maxDbhCm === '' || values.maxDbhCm == null
              ? undefined
              : Number(values.maxDbhCm),
          description: values.description?.trim() ?? '',
          isActive,
        },
      });
      success('Species updated');
      close();
    } catch (err) {
      toastError(
        "Couldn't update species",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  if (!species) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="flex flex-col sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            Edit species
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">{species.name}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="-mx-2 mt-6 flex-1 space-y-4 overflow-y-auto px-2"
        >
          <SpeciesFormFields
            register={register}
            errors={errors}
            isActive={isActive}
            setIsActive={setIsActive}
            disabled={update.isPending}
          />
          {onRequestDelete && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => onRequestDelete(species)}
              disabled={update.isPending}
            >
              <Trash2 className="h-4 w-4" /> Remove species
            </Button>
          )}
          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={(!isDirty && isActive === species.isActive) || update.isPending}
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteSpeciesConfirm({ species, onClose }) {
  const remove = useDeleteSpecies();
  const { success, error: toastError } = useToast();

  async function handleConfirm() {
    try {
      await remove.mutateAsync(species.id ?? species._id);
      success('Species removed');
      onClose();
    } catch (err) {
      toastError("Couldn't remove", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <ConfirmDialog
      open={!!species}
      onOpenChange={(o) => !o && onClose()}
      title={species ? `Remove ${species.name}?` : ''}
      description="If trees of this species exist, the entry is archived instead of hard-deleted."
      confirmLabel="Remove"
      destructive
      busy={remove.isPending}
      onConfirm={handleConfirm}
    />
  );
}

