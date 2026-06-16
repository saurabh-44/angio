import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Banknote,
  HandCoins,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
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
  useAllocations,
  useCreateAllocation,
  useCreateDonation,
  useDeleteAllocation,
  useDonations,
} from '@/queries/donations.js';
import { useSites } from '@/queries/sites.js';
import { useUsers } from '@/queries/users.js';
import { ApiError } from '@/lib/api.js';
import { formatAmount, formatDate } from '@/lib/format.js';

const LIMIT = 20;
const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function DonationsPage() {
  const [donorFilter, setDonorFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [openDonation, setOpenDonation] = useState(null);

  const { data, isLoading, isError, refetch } = useDonations({
    donor: donorFilter || undefined,
    page,
    limit: LIMIT,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Funding"
        title="Donations"
        description="Record each donor's contribution, then allocate it across one or more sites with a target plant count."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Record donation
          </Button>
        }
      />

      <div className="mb-4">
        <DonorFilter value={donorFilter} onChange={(v) => { setDonorFilter(v); setPage(1); }} />
      </div>

      <div className="bento-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load donations"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={donorFilter ? 'No donations from that donor yet' : 'No donations recorded'}
            description="Record a donation and the donor will see their funded trees on their dashboard."
            action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Record donation</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead className="text-right">Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d) => (
                  <TableRow
                    key={d.id ?? d._id}
                    className="cursor-pointer"
                    onClick={() => setOpenDonation(d)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{d.donor?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {d.donor?.email ?? ''}
                      </div>
                    </TableCell>
                    <TableCell className="font-heading text-base font-semibold text-foreground">
                      {formatAmount(d.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted" className="capitalize">{d.method?.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(d.paidAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className="text-primary font-medium">Manage →</span>
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

      <CreateDonationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DonationDetailSheet donation={openDonation} onClose={() => setOpenDonation(null)} />
    </>
  );
}

function DonorFilter({ value, onChange }) {
  const { data, isLoading } = useUsers({ role: 'donor', limit: 200 });
  const donors = data?.items ?? [];
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)} disabled={isLoading}>
        <SelectTrigger className="sm:w-72">
          <SelectValue placeholder="All donors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All donors</SelectItem>
          {donors.map((d) => (
            <SelectItem key={d.id ?? d._id} value={d.id ?? d._id}>
              {d.name} <span className="text-muted-foreground">· {d.email}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <Button variant="ghost" onClick={() => onChange('')}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}

function CreateDonationDialog({ open, onOpenChange }) {
  const create = useCreateDonation();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({ defaultValues: { method: 'cash' } });
  const [donor, setDonor] = useState('');
  const method = watch('method');

  function close() {
    onOpenChange(false);
    reset({ method: 'cash' });
    setDonor('');
  }

  async function onSubmit(values) {
    if (!donor) {
      toastError('Pick a donor', 'Choose who this donation is from.');
      return;
    }
    try {
      await create.mutateAsync({
        donor,
        amount: values.amount,
        paidAt: values.paidAt || undefined,
        method: values.method,
        note: values.note?.trim() || undefined,
      });
      success('Donation recorded', 'Now allocate it to one or more sites.');
      close();
    } catch (err) {
      toastError(
        "Couldn't record donation",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a donation</DialogTitle>
          <DialogDescription>
            Money received from a donor. Allocate it to specific sites in the next step.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Donor</Label>
            <DonorSelect value={donor} onChange={setDonor} disabled={create.isPending} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                disabled={create.isPending}
                {...register('amount', {
                  required: 'Required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Must be > 0' },
                })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAt">Date received</Label>
              <Input
                id="paidAt"
                type="date"
                disabled={create.isPending}
                {...register('paidAt')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setValue('method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" disabled={create.isPending} {...register('note')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record donation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DonorSelect({ value, onChange, disabled }) {
  const { data, isLoading } = useUsers({ role: 'donor', limit: 200 });
  const donors = data?.items ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading…' : 'Pick a donor'} />
      </SelectTrigger>
      <SelectContent>
        {donors.length === 0 && !isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No donors yet. Add one from Users.
          </div>
        ) : (
          donors.map((d) => (
            <SelectItem key={d.id ?? d._id} value={d.id ?? d._id}>
              {d.name} <span className="text-muted-foreground">· {d.email}</span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function DonationDetailSheet({ donation, onClose }) {
  const open = !!donation;
  const { data: allocsData } = useAllocations({
    donation: donation?.id ?? donation?._id,
    limit: 100,
    enabled: !!donation,
  });
  const allocations = allocsData?.items ?? [];
  const allocatedTotal = useMemo(
    () => allocations.reduce((s, a) => s + (a.allocatedAmount ?? 0), 0),
    [allocations],
  );
  const allocatedPlants = useMemo(
    () => allocations.reduce((s, a) => s + (a.targetPlants ?? 0), 0),
    [allocations],
  );
  const remaining = (donation?.amount ?? 0) - allocatedTotal;

  if (!donation) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle>{donation.donor?.name ?? 'Donation'}</SheetTitle>
          <SheetDescription>
            {donation.donor?.email} · {formatDate(donation.paidAt)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <SummaryStat icon={Banknote} label="Donated" value={formatAmount(donation.amount)} />
          <SummaryStat
            icon={Sparkles}
            label="Allocated"
            value={formatAmount(allocatedTotal)}
            tone={remaining > 0 ? 'amber' : 'leaf'}
          />
          <SummaryStat icon={Leaf} label="Target trees" value={String(allocatedPlants)} />
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold text-foreground">Allocations</h3>
            <Badge variant={remaining > 0 ? 'accent' : 'success'}>
              {remaining > 0 ? `${formatAmount(remaining)} unallocated` : 'Fully allocated'}
            </Badge>
          </div>

          {allocations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
              No allocations yet. Use the form below to split this donation across one or more sites.
            </div>
          ) : (
            <ul className="space-y-2">
              {allocations.map((a) => (
                <AllocationRow key={a.id ?? a._id} allocation={a} />
              ))}
            </ul>
          )}

          {remaining > 0 && (
            <AddAllocationForm donation={donation} remaining={remaining} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryStat({ icon: Icon, label, value, tone = 'leaf' }) {
  const tones = {
    leaf: 'bg-leaf-50 text-leaf-700',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${tones[tone] ?? tones.leaf}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="mt-2 font-heading text-lg font-bold text-foreground tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function AllocationRow({ allocation }) {
  const remove = useDeleteAllocation();
  const { success, error: toastError } = useToast();
  async function handleDelete() {
    try {
      await remove.mutateAsync(allocation.id ?? allocation._id);
      success('Allocation removed');
    } catch (err) {
      toastError(
        "Couldn't remove allocation",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }
  return (
    <li className="bento-card p-4 flex items-start gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
        <MapPin className="h-4 w-4" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">
          {allocation.site?.name ?? 'Site'}
        </div>
        <div className="text-xs text-muted-foreground line-clamp-1">
          {allocation.site?.address ?? ''}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Badge variant="default">{allocation.targetPlants} trees</Badge>
          <Badge variant="muted">{formatAmount(allocation.allocatedAmount)}</Badge>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={remove.isPending}
        aria-label="Remove allocation"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}

function AddAllocationForm({ donation, remaining }) {
  const create = useCreateAllocation();
  const { success, error: toastError } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();
  const [site, setSite] = useState('');

  async function onSubmit(values) {
    if (!site) {
      toastError('Pick a site', 'Choose the site this allocation funds.');
      return;
    }
    if (values.allocatedAmount > remaining) {
      toastError(
        'Too much',
        `Only ${formatAmount(remaining)} is unallocated for this donation.`,
      );
      return;
    }
    try {
      await create.mutateAsync({
        donation: donation.id ?? donation._id,
        site,
        targetPlants: values.targetPlants,
        allocatedAmount: values.allocatedAmount,
        note: values.note?.trim() || undefined,
      });
      success('Allocation added');
      reset({});
      setSite('');
    } catch (err) {
      toastError(
        "Couldn't add allocation",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-3"
    >
      <div className="text-sm font-medium text-foreground">Add allocation</div>
      <SiteSelect value={site} onChange={setSite} disabled={create.isPending} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="targetPlants" className="text-xs">Target trees</Label>
          <Input
            id="targetPlants"
            type="number"
            min="1"
            placeholder="50"
            disabled={create.isPending}
            {...register('targetPlants', {
              required: true,
              valueAsNumber: true,
              min: 1,
            })}
          />
          {errors.targetPlants && (
            <p className="text-xs text-destructive">At least one tree.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allocatedAmount" className="text-xs">
            Amount (max {formatAmount(remaining)})
          </Label>
          <Input
            id="allocatedAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={create.isPending}
            {...register('allocatedAmount', {
              required: true,
              valueAsNumber: true,
              min: 0,
            })}
          />
        </div>
      </div>
      <Input
        placeholder="Note (optional)"
        disabled={create.isPending}
        {...register('note')}
      />
      <Button type="submit" disabled={create.isPending} className="w-full">
        {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        <Plus className="h-4 w-4" /> Add allocation
      </Button>
    </form>
  );
}

function SiteSelect({ value, onChange, disabled }) {
  const { data, isLoading } = useSites({ limit: 200 });
  const sites = data?.items ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading…' : 'Choose a site'} />
      </SelectTrigger>
      <SelectContent>
        {sites.length === 0 && !isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No sites yet.
          </div>
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
