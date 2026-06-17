import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  FolderKanban,
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
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from '@/queries/projects.js';
import { ApiError } from '@/lib/api.js';
import { formatDate } from '@/lib/format.js';

const LIMIT = 20;
const STATUSES = ['active', 'completed', 'archived'];

function statusStyles(status) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700';
    case 'completed':
      return 'bg-sky-50 text-sky-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function ProjectsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const { data, isLoading, isError, refetch } = useProjects({
    q: q || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Campaign grouping"
        title="Projects"
        description="Group donations and allocations by campaign — sponsorship drives, corporate partnerships, monsoon cycles — for cleaner impact reports."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1 min-w-[14rem]">
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
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setStatus(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <EmptyState
            title="Couldn't load projects"
            description="Check your connection and try again."
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={q || status ? 'No matches' : 'No projects yet'}
            description={
              q || status
                ? 'Try clearing your filters.'
                : 'Group allocations by campaign so you can show sponsors exactly which drive their money funded.'
            }
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Target trees</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => (
                  <TableRow
                    key={p.id ?? p._id}
                    className="cursor-pointer"
                    onClick={() => setEditing(p)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                          {p.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles(
                          p.status,
                        )}`}
                      >
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-sm">
                      {p.targetTrees ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.startsAt ? formatDate(p.startsAt) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.endsAt ? formatDate(p.endsAt) : '—'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(p)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmingDelete(p)}
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

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProjectFormSheet project={editing} onClose={() => setEditing(null)} />
      <DeleteProjectConfirm project={confirmingDelete} onClose={() => setConfirmingDelete(null)} />
    </>
  );
}

function ProjectFormFields({ register, errors, status, setStatus, disabled }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          placeholder="e.g. Monsoon 2026, TCS Sponsorship"
          disabled={disabled}
          {...register('name', { required: 'Required', maxLength: 200 })}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-desc">Description</Label>
        <textarea
          id="project-desc"
          rows={3}
          placeholder="Optional summary of the campaign"
          disabled={disabled}
          className="flex w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register('description', { maxLength: 2000 })}
        />
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus} disabled={disabled}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-target">Target trees</Label>
        <Input
          id="project-target"
          type="number"
          min="0"
          placeholder="Optional headline number"
          disabled={disabled}
          {...register('targetTrees', { valueAsNumber: true, min: 0 })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="project-start">Starts</Label>
          <Input
            id="project-start"
            type="date"
            disabled={disabled}
            {...register('startsAt')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-end">Ends</Label>
          <Input
            id="project-end"
            type="date"
            disabled={disabled}
            {...register('endsAt')}
          />
        </div>
      </div>
    </>
  );
}

function toIsoOrUndef(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function ProjectFormDialog({ open, onOpenChange }) {
  const create = useCreateProject();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const [status, setStatus] = useState('active');

  function close() {
    onOpenChange(false);
    reset();
    setStatus('active');
  }

  async function onSubmit(values) {
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        status,
        targetTrees: Number.isFinite(values.targetTrees) ? values.targetTrees : undefined,
        startsAt: toIsoOrUndef(values.startsAt),
        endsAt: toIsoOrUndef(values.endsAt),
      });
      success('Project created');
      close();
    } catch (err) {
      toastError(
        "Couldn't create project",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Allocations tagged to a project can be sliced together in impact reports.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ProjectFormFields
            register={register}
            errors={errors}
            status={status}
            setStatus={setStatus}
            disabled={create.isPending}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function dateInputValue(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function ProjectFormSheet({ project, onClose }) {
  const update = useUpdateProject();
  const { success, error: toastError } = useToast();
  const open = !!project;
  const initial = useMemo(
    () => ({
      name: project?.name ?? '',
      description: project?.description ?? '',
      targetTrees: project?.targetTrees ?? '',
      startsAt: dateInputValue(project?.startsAt),
      endsAt: dateInputValue(project?.endsAt),
    }),
    [project],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({ values: initial });
  const [status, setStatus] = useState('active');

  useMemo(() => {
    setStatus(project?.status ?? 'active');
  }, [project]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values) {
    try {
      await update.mutateAsync({
        id: project.id ?? project._id,
        patch: {
          name: values.name.trim(),
          description: values.description?.trim() ?? '',
          status,
          targetTrees:
            values.targetTrees === '' || values.targetTrees == null
              ? undefined
              : Number(values.targetTrees),
          startsAt: toIsoOrUndef(values.startsAt),
          endsAt: toIsoOrUndef(values.endsAt),
        },
      });
      success('Project updated');
      close();
    } catch (err) {
      toastError(
        "Couldn't update project",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  if (!project) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Edit project</SheetTitle>
          <SheetDescription>{project.name}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-4 mt-6 overflow-y-auto pr-1"
        >
          <ProjectFormFields
            register={register}
            errors={errors}
            status={status}
            setStatus={setStatus}
            disabled={update.isPending}
          />
          <SheetFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={close} disabled={update.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={(!isDirty && status === project.status) || update.isPending}
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

function DeleteProjectConfirm({ project, onClose }) {
  const remove = useDeleteProject();
  const { success, error: toastError } = useToast();

  async function handleConfirm() {
    try {
      await remove.mutateAsync(project.id ?? project._id);
      success('Project removed');
      onClose();
    } catch (err) {
      toastError("Couldn't remove", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <ConfirmDialog
      open={!!project}
      onOpenChange={(o) => !o && onClose()}
      title={project ? `Remove ${project.name}?` : ''}
      description="Allocations tagged to this project keep their tag for historical reference."
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
