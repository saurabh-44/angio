import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAttachablePlants, useAttachPlants } from '@/queries/donations.js';
import { ApiError } from '@/lib/api.js';
import { formatGeo } from '@/lib/format.js';
import { cn } from '@/lib/utils';

// Picker of existing, unassigned trees on an order's site that can be linked
// to it. Used by the admin Donations page AND the site-incharge dashboard —
// the backend caps how many can be assigned (the order's remaining count) and
// re-validates eligibility, so this is a convenience layer only.
export default function AttachTreesPanel({ allocationId, onDone }) {
  const { data, isLoading } = useAttachablePlants(allocationId);
  const attach = useAttachPlants();
  const { success, error: toastError } = useToast();
  const [selected, setSelected] = useState(() => new Set());

  const remaining = data?.remaining ?? 0;
  const candidates = data?.candidates ?? [];

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < remaining) next.add(id); // never select past the cap
      return next;
    });
  }
  function fill() {
    setSelected(new Set(candidates.slice(0, remaining).map((c) => c.id ?? c._id)));
  }
  async function submit() {
    try {
      const res = await attach.mutateAsync({ allocationId, plantIds: [...selected] });
      success(
        'Trees assigned',
        `${res.attached} existing tree${res.attached === 1 ? '' : 's'} linked to this order.`,
      );
      setSelected(new Set());
      onDone?.();
    } catch (err) {
      toastError("Couldn't assign trees", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  if (isLoading) return <Skeleton className="mt-3 h-24 w-full rounded-[10px]" />;

  if (remaining === 0) {
    return (
      <p className="mt-3 rounded-[10px] bg-[#F6FAF6] px-3 py-2 text-xs text-[#1E1E1E]/60">
        This order is fully planted — nothing left to assign.
      </p>
    );
  }
  if (candidates.length === 0) {
    return (
      <p className="mt-3 rounded-[10px] bg-[#F6FAF6] px-3 py-2 text-xs text-[#1E1E1E]/60">
        No unassigned trees are available on this site to assign. Record plantings first.
      </p>
    );
  }

  const cap = Math.min(remaining, candidates.length);
  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#1E1E1E]/60">
        <span>
          {data.planted} of {data.targetPlants} planted ·{' '}
          <strong className="text-[#0B5000]">{remaining} remaining</strong> · {data.available} available
        </span>
        <button
          type="button"
          onClick={fill}
          className="font-medium text-[#0B5000] underline-offset-2 hover:underline"
        >
          Select {cap}
        </button>
      </div>

      <div className="max-h-56 space-y-1 overflow-auto rounded-[10px] border border-[#E2E8F0] p-1.5">
        {candidates.map((c) => {
          const id = c.id ?? c._id;
          const checked = selected.has(id);
          const disabled = !checked && selected.size >= remaining;
          return (
            <label
              key={id}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                checked ? 'bg-[#0B5000]/10' : 'hover:bg-[#F6FAF6]',
                disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(id)}
                className="h-4 w-4 shrink-0 accent-[#0B5000]"
              />
              <span className="min-w-0 flex-1 truncate font-medium text-[#001F00]">
                {c.name || c.species || 'Tree'}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[#1E1E1E]/45">
                {c.geo ? formatGeo(c.geo) : '—'}
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[#1E1E1E]/50">
          {selected.size} selected{selected.size >= remaining ? ' (max)' : ''}
        </span>
        <Button type="button" size="sm" onClick={submit} disabled={selected.size === 0 || attach.isPending}>
          {attach.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Assign {selected.size || ''} tree{selected.size === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
}
