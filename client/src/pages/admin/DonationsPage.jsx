import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Banknote, HandCoins, Leaf, Loader2, MapPin, Plus, Sparkles, Trash2 } from 'lucide-react';
import ExportButton from '@/components/ExportButton.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Pagination from '@/components/Pagination.jsx';
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
  useUpdateDonation,
} from '@/queries/donations.js';
import { useSites } from '@/queries/sites.js';
import { useUsers } from '@/queries/users.js';
import { ApiError } from '@/lib/api.js';
import { formatAmount, formatDate } from '@/lib/format.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const LIMIT = 20;
const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

// Payment status — online sponsor orders start `pending` until Razorpay
// verification flips them to `paid`; offline records are `paid`.
const DONATION_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const DONATION_STATUS_LABEL = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};
const DONATION_PILL = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-[#0B5000]/10 text-[#0B5000]',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-[#E2E8F0] text-[#1E1E1E]/70',
};

function StatusPill({ status }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-medium',
        DONATION_PILL[status] ?? 'bg-[#E2E8F0] text-[#1E1E1E]/70',
      )}
    >
      {DONATION_STATUS_LABEL[status] ?? status ?? 'Unknown'}
    </span>
  );
}

function MethodPill({ method }) {
  return (
    <span className="inline-flex rounded-full bg-[#E2E8F0] px-3 py-1 text-xs capitalize text-[#1E1E1E]/70">
      {method?.replace('_', ' ') ?? '—'}
    </span>
  );
}

export default function DonationsPage() {
  const [searchParams] = useSearchParams();
  const [donorFilter, setDonorFilter] = useState(searchParams.get('donor') ?? '');
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
    <div style={{ fontFamily: BODY_FONT }}>
      <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        Donations
      </h1>
      <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
        Record each sponsor's contribution, then allocate it across one or more sites with a target
        plant count.
      </p>

      {/* Sponsor filter + Export + Record donation */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <DonorFilter
          value={donorFilter}
          onChange={(v) => {
            setDonorFilter(v);
            setPage(1);
          }}
        />
        <div className="ml-auto flex items-center gap-3">
          <ExportButton
            href={`/api/excel/export/donations.xlsx${donorFilter ? `?donor=${donorFilter}` : ''}`}
            label="Export"
          />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#001F00] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-[#013300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5000] focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden /> Record donation
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-7 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-10">
          <EmptyState
            title="Couldn't load donations"
            action={<Button onClick={() => refetch()}>Retry</Button>}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={HandCoins}
            title={donorFilter ? 'No donations from that sponsor yet' : 'No donations recorded'}
            description="Record a donation and the sponsor will see their funded trees on their dashboard."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Record donation
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-7 overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse">
              <thead>
                <tr>
                  {['Sponsor', 'Amount', 'Method', 'Status', 'Paid', 'Recorded'].map((h) => (
                    <th key={h} className="pb-4 text-left text-base font-medium text-[#001F00] first:pl-1">
                      {h}
                    </th>
                  ))}
                  <th className="pb-4 text-right text-base font-medium text-[#001F00]">Allocations</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr
                    key={d.id ?? d._id}
                    onClick={() => setOpenDonation(d)}
                    className="cursor-pointer border-t border-[#E2E8F0] transition-colors hover:bg-[#F6FAF6]"
                  >
                    <td className="py-4 pr-4 first:pl-1">
                      <div className="font-medium text-[#001F00]">{d.donor?.name ?? '—'}</div>
                      <div className="mt-0.5 text-xs text-[#1E1E1E]/50">{d.donor?.email ?? ''}</div>
                    </td>
                    <td className="py-4 pr-4 text-base font-semibold text-[#001F00]">
                      {formatAmount(d.amount)}
                    </td>
                    <td className="py-4 pr-4">
                      <MethodPill method={d.method} />
                    </td>
                    <td className="py-4 pr-4">
                      <StatusPill status={d.status} />
                    </td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]/60">{formatDate(d.paidAt)}</td>
                    <td className="py-4 pr-4 text-sm text-[#1E1E1E]/60">{formatDate(d.createdAt)}</td>
                    <td className="py-4 text-right text-sm font-medium text-[#0B5000]">Manage →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={LIMIT} total={total} onChange={setPage} />
        </>
      )}

      <CreateDonationDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DonationDetailSheet donation={openDonation} onClose={() => setOpenDonation(null)} />
    </div>
  );
}

function DonorFilter({ value, onChange }) {
  const { data, isLoading } = useUsers({ role: 'sponsor', limit: 200 });
  const donors = data?.items ?? [];
  return (
    <Select
      value={value || 'all'}
      onValueChange={(v) => onChange(v === 'all' ? '' : v)}
      disabled={isLoading}
    >
      <SelectTrigger className="h-auto w-full max-w-[300px] rounded-[10px] border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder="All sponsors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All sponsors</SelectItem>
        {donors.map((d) => (
          <SelectItem key={d.id ?? d._id} value={d.id ?? d._id}>
            {d.name} <span className="text-muted-foreground">· {d.email}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      toastError('Pick a sponsor', 'Choose which sponsor this donation is from.');
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
      toastError("Couldn't record donation", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="rounded-[10px] sm:max-w-lg" style={{ fontFamily: BODY_FONT }}>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-2xl font-medium text-[#001F00]" style={{ fontFamily: BODY_FONT }}>
            Record a donation
          </DialogTitle>
          <DialogDescription className="text-base text-[#1E1E1E]/50">
            Money received from a sponsor. Allocate it to specific sites in the next step.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label className="text-[#001F00]">Sponsor</Label>
            <DonorSelect value={donor} onChange={setDonor} disabled={create.isPending} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-[#001F00]">Amount</Label>
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
              <Label htmlFor="paidAt" className="text-[#001F00]">Date received</Label>
              <Input id="paidAt" type="date" disabled={create.isPending} {...register('paidAt')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#001F00]">Payment method</Label>
            <Select value={method} onValueChange={(v) => setValue('method', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-[#001F00]">Note (optional)</Label>
            <Input id="note" disabled={create.isPending} {...register('note')} />
          </div>

          <button
            type="submit"
            disabled={create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-70"
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Record donation
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DonorSelect({ value, onChange, disabled }) {
  const { data, isLoading } = useUsers({ role: 'sponsor', limit: 200 });
  const donors = data?.items ?? [];
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading…' : 'Pick a sponsor'} />
      </SelectTrigger>
      <SelectContent>
        {donors.length === 0 && !isLoading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No sponsors yet. Add one from Users.
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
      <SheetContent side="right" className="flex flex-col sm:max-w-xl" style={{ fontFamily: BODY_FONT }}>
        <SheetHeader>
          <SheetTitle className="text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
            {donation.donor?.name ?? 'Donation'}
          </SheetTitle>
          <SheetDescription className="text-[#1E1E1E]/50">
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

        <div className="mt-5">
          <DonationStatusChanger donation={donation} />
        </div>

        {formatAddress(donation.billingAddress) && (
          <div className="mt-4 rounded-[10px] border border-[#E2E8F0] p-3.5">
            <div className="flex items-center gap-2 text-sm font-medium text-[#001F00]">
              <MapPin className="h-4 w-4 text-[#0B5000]" aria-hidden /> Billing address
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-[#1E1E1E]/60">
              {formatAddress(donation.billingAddress)}
            </p>
          </div>
        )}

        <div className="mt-6 -mx-2 flex-1 overflow-y-auto px-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-[#1E1E1E]/50">
              Allocations
            </h3>
            <span
              className={cn(
                'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                remaining > 0 ? 'bg-amber-100 text-amber-700' : 'bg-[#0B5000]/10 text-[#0B5000]',
              )}
            >
              {remaining > 0 ? `${formatAmount(remaining)} unallocated` : 'Fully allocated'}
            </span>
          </div>

          {allocations.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#B4B4B4] p-6 text-center text-sm text-[#1E1E1E]/50">
              No allocations yet. Use the form below to split this donation across one or more sites.
            </div>
          ) : (
            <ul className="space-y-2">
              {allocations.map((a) => (
                <AllocationRow key={a.id ?? a._id} allocation={a} />
              ))}
            </ul>
          )}

          {remaining > 0 && <AddAllocationForm donation={donation} remaining={remaining} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Joins a stored address sub-doc into a single readable line; '' if empty.
function formatAddress(a) {
  if (!a) return '';
  return [a.line1, a.line2, a.city, a.state, a.pinCode, a.country]
    .map((s) => (s ? String(s).trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function DonationStatusChanger({ donation }) {
  const update = useUpdateDonation();
  const { success, error: toastError } = useToast();
  const current = donation.status ?? 'pending';

  async function onChange(status) {
    if (status === current) return;
    try {
      await update.mutateAsync({ id: donation.id ?? donation._id, patch: { status } });
      success('Status updated', `Marked as ${DONATION_STATUS_LABEL[status] ?? status}.`);
    } catch (err) {
      toastError("Couldn't update status", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E2E8F0] p-3.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-sm text-[#1E1E1E]/60">Payment status</span>
        <StatusPill status={current} />
      </div>
      <Select value={current} onValueChange={onChange} disabled={update.isPending}>
        <SelectTrigger className="w-36 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DONATION_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{DONATION_STATUS_LABEL[s] ?? s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value, tone = 'leaf' }) {
  const tones = {
    leaf: 'bg-[#0B5000]/10 text-[#0B5000]',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="rounded-[10px] border border-[#E2E8F0] bg-white p-3">
      <div className={cn('inline-grid h-8 w-8 place-items-center rounded-lg', tones[tone] ?? tones.leaf)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="mt-2 text-lg font-bold tracking-tight text-[#001F00]">{value}</div>
      <div className="text-xs text-[#1E1E1E]/50">{label}</div>
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
      toastError("Couldn't remove allocation", err instanceof ApiError ? err.message : 'Try again.');
    }
  }
  return (
    <li className="flex items-start gap-3 rounded-[10px] border border-[#E2E8F0] p-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0B5000]/10 text-[#0B5000]">
        <MapPin className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-[#001F00]">{allocation.site?.name ?? 'Site'}</div>
        <div className="line-clamp-1 text-xs text-[#1E1E1E]/50">{allocation.site?.address ?? ''}</div>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex rounded-full bg-[#0B5000]/10 px-3 py-1 text-xs font-medium text-[#0B5000]">
            {allocation.targetPlants} trees
          </span>
          <span className="inline-flex rounded-full bg-[#E2E8F0] px-3 py-1 text-xs font-medium text-[#1E1E1E]/70">
            {formatAmount(allocation.allocatedAmount)}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={remove.isPending}
        aria-label="Remove allocation"
        className="text-[#1E1E1E]/50 hover:text-destructive"
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
      toastError('Too much', `Only ${formatAmount(remaining)} is unallocated for this donation.`);
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
      toastError("Couldn't add allocation", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 space-y-3 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] p-4"
    >
      <div className="text-sm font-medium text-[#001F00]">Add allocation</div>
      <SiteSelect value={site} onChange={setSite} disabled={create.isPending} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="targetPlants" className="text-xs text-[#001F00]">Target trees</Label>
          <Input
            id="targetPlants"
            type="number"
            min="1"
            placeholder="50"
            disabled={create.isPending}
            {...register('targetPlants', { required: true, valueAsNumber: true, min: 1 })}
          />
          {errors.targetPlants && <p className="text-xs text-destructive">At least one tree.</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="allocatedAmount" className="text-xs text-[#001F00]">
            Amount (max {formatAmount(remaining)})
          </Label>
          <Input
            id="allocatedAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            disabled={create.isPending}
            {...register('allocatedAmount', { required: true, valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>
      <Input placeholder="Note (optional)" disabled={create.isPending} {...register('note')} />
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
