import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Leaf,
  Loader2,
  MoreHorizontal,
  Plus,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import {
  useCreateSpecies,
  useDeleteSpecies,
  useSpeciesList,
  useUpdateSpecies,
} from '@/queries/species.js';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';

const LIMIT = 20;

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
    <>
      <PageHeader
        eyebrow="Reference data"
        title="Species"
        description="Tree species your volunteers can pick from. Each species can carry its own CO₂ absorption rate for more accurate estimates."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add species
          </Button>
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
            placeholder="Search by name"
            className="pl-10"
          />
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            title="Couldn't load species"
            description="Check your connection and try again."
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Leaf}
            title={q ? 'No matches' : 'No species yet'}
            description={
              q
                ? 'Try clearing the search.'
                : 'Add the species your NGO plants so volunteers can pick from a dropdown.'
            }
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Add species
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Scientific name</TableHead>
                  <TableHead>CO₂ / year</TableHead>
                  <TableHead>Status</TableHead>
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
                      {s.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                          {s.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm italic text-muted-foreground">
                      {s.scientificName || '—'}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">
                      {s.co2PerYearKg != null ? `${s.co2PerYearKg} kg` : '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.isActive ? 'Active' : 'Archived'}
                      </span>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmingDelete(s)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                          </DropdownMenuItem>
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

      <SpeciesFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SpeciesFormSheet species={editing} onClose={() => setEditing(null)} />
      <DeleteSpeciesConfirm species={confirmingDelete} onClose={() => setConfirmingDelete(null)} />
    </>
  );
}

function SpeciesFormFields({ register, errors, isActive, setIsActive, disabled }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="species-name">Common name</Label>
        <Input
          id="species-name"
          placeholder="e.g. Neem, Banyan, Mango"
          disabled={disabled}
          {...register('name', { required: 'Required', maxLength: 120 })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-sci">Scientific name</Label>
        <Input
          id="species-sci"
          placeholder="Optional — e.g. Azadirachta indica"
          disabled={disabled}
          {...register('scientificName', { maxLength: 180 })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-co2">CO₂ absorption (kg / year)</Label>
        <Input
          id="species-co2"
          type="number"
          step="0.1"
          min="0"
          placeholder="e.g. 22"
          disabled={disabled}
          {...register('co2PerYearKg', { valueAsNumber: true, min: 0 })}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to use the default rate of 22 kg/year.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="species-height">Max height (cm)</Label>
          <Input
            id="species-height"
            type="number"
            min="0"
            placeholder="Optional"
            disabled={disabled}
            {...register('maxHeightCm', { valueAsNumber: true, min: 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="species-dbh">Max trunk Ø (cm)</Label>
          <Input
            id="species-dbh"
            type="number"
            min="0"
            placeholder="Optional"
            disabled={disabled}
            {...register('maxDbhCm', { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="species-desc">Description</Label>
        <textarea
          id="species-desc"
          rows={3}
          placeholder="Optional notes about the species"
          disabled={disabled}
          className="flex w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description', { maxLength: 2000 })}
        />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
        <div>
          <Label className="text-sm">Active</Label>
          <p className="text-xs text-muted-foreground">
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New species</DialogTitle>
          <DialogDescription>
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add species
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpeciesFormSheet({ species, onClose }) {
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
      <SheetContent side="right" className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit species</SheetTitle>
          <SheetDescription>{species.name}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-4 mt-6 overflow-y-auto pr-1"
        >
          <SpeciesFormFields
            register={register}
            errors={errors}
            isActive={isActive}
            setIsActive={setIsActive}
            disabled={update.isPending}
          />
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

function TableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
