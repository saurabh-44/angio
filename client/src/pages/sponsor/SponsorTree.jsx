import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Info,
  Leaf,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAuth } from '@/lib/auth.jsx';
import { useSponsorshipInfo, useCreateSponsorOrder, useVerifyPayment } from '@/queries/payments.js';
import { useAvailableSites } from '@/queries/sites.js';
import { loadRazorpayScript, openRazorpayCheckout } from '@/lib/razorpay.js';
import { formatAmount, formatDate } from '@/lib/format.js';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';

const ANY_SITE = '__any__';
const STEPS = ['Tree detail', 'Billing', 'Order placed'];

// Sponsor self-service order wizard. 3 steps in one route:
//   1. Tree detail — site (optional), how many, donation date.
//   2. Billing — auto-filled contact + total, pay via Razorpay.
//   3. Order placed — summary + link to track status.
// A tree count stashed by the public hero (pendingSponsorTrees) prefills
// step 1 and is cleared on mount.
export default function SponsorTree() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const info = useSponsorshipInfo();
  const sites = useAvailableSites();
  const createOrder = useCreateSponsorOrder();
  const verify = useVerifyPayment();

  const [step, setStep] = useState(1);
  const [count, setCount] = useState(1);
  const [siteId, setSiteId] = useState(ANY_SITE);
  const [donationDate, setDonationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  // Billing address — prefilled from the sponsor's saved address (if any).
  const [address, setAddress] = useState(() => ({
    line1: user?.address?.line1 ?? '',
    line2: user?.address?.line2 ?? '',
    city: user?.address?.city ?? '',
    state: user?.address?.state ?? '',
    pinCode: user?.address?.pinCode ?? '',
    country: user?.address?.country ?? 'India',
  }));
  const [saveAddress, setSaveAddress] = useState(true);

  // Resume the hero's choice (tree count + optional celebration note).
  useEffect(() => {
    const trees = Number(sessionStorage.getItem('pendingSponsorTrees'));
    if (Number.isFinite(trees) && trees >= 1) setCount(Math.min(1000, Math.floor(trees)));
    const pendingNote = sessionStorage.getItem('pendingSponsorNote');
    if (pendingNote) setNote(pendingNote);
    sessionStorage.removeItem('pendingSponsorTrees');
    sessionStorage.removeItem('pendingSponsorNote');
  }, []);

  useEffect(() => {
    if (info.data?.razorpayEnabled) loadRazorpayScript();
  }, [info.data?.razorpayEnabled]);

  if (info.isLoading) {
    return (
      <>
        <PageHeader eyebrow="Sponsor trees" title="Sponsor a tree" />
        <Skeleton className="h-72 w-full" />
      </>
    );
  }

  const availableSites = sites.data?.items ?? [];
  const selectedSite = siteId !== ANY_SITE ? availableSites.find((s) => s.id === siteId) : null;
  const globalUnit = info.data?.unitPriceInr ?? 0;
  const unit = selectedSite?.pricePerTreeInr ?? globalUnit;
  const total = count * unit;
  const razorpayReady = !!info.data?.razorpayEnabled;

  function goToBilling() {
    if (count < 1) return;
    if (
      selectedSite &&
      selectedSite.remaining != null &&
      count > selectedSite.remaining
    ) {
      toastError('Not enough room', `${selectedSite.name} has space for ${selectedSite.remaining} more tree(s).`);
      return;
    }
    setStep(2);
  }

  async function handlePay() {
    if (busy) return;
    // Billing address is required to place an order.
    if (!address.line1?.trim() || !address.city?.trim() || !address.state?.trim() || !address.pinCode?.trim()) {
      toastError('Billing address needed', 'Please fill your address (street, city, state, and PIN) to continue.');
      return;
    }
    setBusy(true);
    // Tracks whether Razorpay actually captured the money. If verification
    // fails AFTER this point, the payment succeeded — we must NOT tell the
    // sponsor it failed (they'd think they weren't charged and retry).
    let captured = false;
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toastError("Couldn't load payment SDK", 'Check your connection and try again.');
        return;
      }
      const orderRes = await createOrder.mutateAsync({
        treeCount: count,
        site: siteId !== ANY_SITE ? siteId : undefined,
        donationDate: donationDate || undefined,
        note: note.trim() || undefined,
        address: {
          line1: address.line1.trim(),
          line2: address.line2.trim() || undefined,
          city: address.city.trim(),
          state: address.state.trim(),
          pinCode: address.pinCode.trim(),
          country: address.country.trim() || undefined,
        },
        saveAddress,
      });
      const response = await openRazorpayCheckout({
        keyId: orderRes.razorpay.keyId,
        orderId: orderRes.razorpay.orderId,
        amount: orderRes.razorpay.amount,
        currency: orderRes.razorpay.currency,
        name: 'Environ',
        description: `Sponsor ${count} ${count === 1 ? 'tree' : 'trees'}`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone ?? undefined },
      });
      captured = true;
      await verify.mutateAsync({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      setPlaced({
        orderId: orderRes.donation?.id ?? null,
        count,
        total,
        date: donationDate,
        siteName: selectedSite?.name ?? null,
      });
      setStep(3);
      success('Payment received', 'Your order is placed — track planting on your dashboard.');
    } catch (err) {
      if (err?.cancelled) return; // dismissed checkout — no error
      if (captured) {
        // Money was taken but the server couldn't confirm it (e.g. a
        // transient backend/DB issue). Don't imply failure.
        toastError(
          'Payment received — confirming your order',
          "We couldn't confirm it just now. Check My Orders in a minute; if it's missing, contact us — you won't be charged again.",
        );
        return;
      }
      const msg = err instanceof ApiError ? err.message : err?.message ?? 'Something went wrong.';
      toastError("Couldn't complete payment", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Sponsor trees" title="Sponsor a tree" />

      <StepBar step={step} />

      {!razorpayReady && step !== 3 && <RazorpayDisabledNotice />}

      {step === 1 && (
        <TreeDetailStep
          count={count}
          setCount={setCount}
          siteId={siteId}
          setSiteId={setSiteId}
          donationDate={donationDate}
          setDonationDate={setDonationDate}
          note={note}
          setNote={setNote}
          unit={unit}
          availableSites={availableSites}
          sitesLoading={sites.isLoading}
          onNext={goToBilling}
        />
      )}

      {step === 2 && (
        <BillingStep
          user={user}
          count={count}
          unit={unit}
          total={total}
          siteName={selectedSite?.name ?? null}
          date={donationDate}
          busy={busy}
          razorpayReady={razorpayReady}
          address={address}
          setAddress={setAddress}
          saveAddress={saveAddress}
          setSaveAddress={setSaveAddress}
          onBack={() => setStep(1)}
          onPay={handlePay}
        />
      )}

      {step === 3 && placed && (
        <OrderPlacedStep placed={placed} onCheckStatus={() => navigate('/sponsor/orders')} />
      )}
    </>
  );
}

function StepBar({ step }) {
  return (
    <div className="mb-6 flex items-center gap-2 sm:gap-4">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary/15 text-primary ring-2 ring-primary',
                  !done && !active && 'bg-secondary text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </span>
              <span
                className={cn(
                  'text-sm font-medium truncate hidden sm:block',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {n < STEPS.length && <span className="h-px flex-1 bg-border" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}

function TreeDetailStep({
  count,
  setCount,
  siteId,
  setSiteId,
  donationDate,
  setDonationDate,
  note,
  setNote,
  unit,
  availableSites,
  sitesLoading,
  onNext,
}) {
  const [countDraft, setCountDraft] = useState(String(count));
  const [editing, setEditing] = useState(false);
  // Mirror `count` into the text field when it changes from outside the
  // input (the landing-widget preset, the +/- buttons) — but never while
  // the user is typing, so they can clear it and enter a new value freely.
  useEffect(() => {
    if (!editing) setCountDraft(String(count));
  }, [count, editing]);

  const selectedSite = siteId !== ANY_SITE ? availableSites.find((s) => s.id === siteId) : null;
  const overCapacity =
    selectedSite && selectedSite.remaining != null && count > selectedSite.remaining;

  return (
    <div className="bento-card p-6 sm:p-8 space-y-6 max-w-2xl">
      <h2 className="font-heading text-base font-semibold">Tree detail</h2>

      <div className="space-y-2">
        <Label>Preferred site (optional)</Label>
        <Select value={siteId} onValueChange={setSiteId} disabled={sitesLoading}>
          <SelectTrigger>
            <SelectValue placeholder={sitesLoading ? 'Loading sites…' : 'Any site (NGO decides)'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SITE}>Any site — let the NGO place them</SelectItem>
            {availableSites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
                {typeof s.pricePerTreeInr === 'number' && (
                  <span className="text-muted-foreground"> · {formatAmount(s.pricePerTreeInr)}/tree</span>
                )}
                {s.remaining != null && (
                  <span className="text-muted-foreground"> · {s.remaining} left</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!sitesLoading && availableSites.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No sites have open capacity right now — the NGO will place your trees.
          </p>
        )}
        {overCapacity && (
          <p className="text-xs text-amber-600">
            {selectedSite.name} has room for only {selectedSite.remaining} more tree
            {selectedSite.remaining === 1 ? '' : 's'}. Reduce the count, or choose “Any
            site” so the NGO can split your {count} trees across multiple sites.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Number of trees</Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            disabled={count <= 1}
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="text"
            inputMode="numeric"
            value={countDraft}
            onFocus={() => setEditing(true)}
            onChange={(e) => {
              const t = e.target.value;
              // Allow empty (mid-edit) or up to 4 digits; ignore the rest.
              if (t === '' || /^\d{1,4}$/.test(t)) {
                setCountDraft(t);
                if (t !== '') setCount(Math.max(1, Math.min(1000, parseInt(t, 10))));
              }
            }}
            onBlur={() => {
              setEditing(false);
              const c = Math.max(1, Math.min(1000, parseInt(countDraft, 10) || 1));
              setCount(c);
              setCountDraft(String(c));
            }}
            className="text-center font-heading text-2xl font-bold w-28 h-14"
            aria-label="Tree count"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setCount((c) => Math.min(1000, c + 1))}
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="ml-2 text-sm text-muted-foreground">{formatAmount(unit)} per tree</div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="donationDate">Donation date</Label>
        <Input
          id="donationDate"
          type="date"
          value={donationDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDonationDate(e.target.value)}
          className="w-48"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. a dedication, occasion, or message"
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          Total <span className="font-heading text-lg font-bold text-foreground">{formatAmount(count * unit)}</span>
        </div>
        <Button size="lg" onClick={onNext} disabled={overCapacity}>
          Create order <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function BillingStep({ user, count, unit, total, siteName, date, busy, razorpayReady, address, setAddress, saveAddress, setSaveAddress, onBack, onPay }) {
  const field = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      <section className="lg:col-span-6 bento-card p-6 sm:p-8 space-y-4">
        <h2 className="font-heading text-base font-semibold">Billing details</h2>
        <p className="text-xs text-muted-foreground">Auto-filled from your account.</p>
        <ReadOnlyField label="Name" value={user?.name} />
        <ReadOnlyField label="Email" value={user?.email} />
        <ReadOnlyField label="Phone" value={user?.phone ?? '—'} />

        <div className="border-t border-border/60 pt-4">
          <h3 className="font-heading text-sm font-semibold">Billing address</h3>
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr-line1">Address</Label>
          <Input id="addr-line1" value={address.line1} onChange={field('line1')} placeholder="House no. / street" disabled={busy} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addr-line2">Apartment, landmark (optional)</Label>
          <Input id="addr-line2" value={address.line2} onChange={field('line2')} disabled={busy} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="addr-city">City</Label>
            <Input id="addr-city" value={address.city} onChange={field('city')} disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-state">State</Label>
            <Input id="addr-state" value={address.state} onChange={field('state')} disabled={busy} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="addr-pin">PIN code</Label>
            <Input id="addr-pin" value={address.pinCode} onChange={field('pinCode')} inputMode="numeric" disabled={busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-country">Country</Label>
            <Input id="addr-country" value={address.country} onChange={field('country')} disabled={busy} />
          </div>
        </div>
        <label className="flex items-center gap-2.5 pt-1 text-sm text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveAddress}
            onChange={(e) => setSaveAddress(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          Save this address for next time
        </label>
      </section>

      <aside className="lg:col-span-6 space-y-4">
        <div className="bento-card surface-biophilic p-6 sm:p-8 space-y-4">
          <h3 className="font-heading text-base font-semibold">Donation details</h3>
          <dl className="space-y-2 text-sm">
            <Row label="No. of trees" value={`${count}`} />
            <Row label="Per tree" value={formatAmount(unit)} />
            {siteName && <Row label="Site" value={siteName} />}
            <Row label="Date" value={formatDate(date)} />
            <div className="border-t border-border/60 pt-3 mt-1 flex items-center justify-between">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-heading text-2xl font-bold text-foreground">{formatAmount(total)}</span>
            </div>
          </dl>

          <Button
            size="lg"
            variant="accent"
            className="w-full text-base"
            onClick={onPay}
            disabled={busy || !razorpayReady}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Leaf className="h-4 w-4" />}
            {busy ? 'Opening checkout…' : `Make payment · ${formatAmount(total)}`}
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Secured by Razorpay. We never see your card details.
          </div>
        </div>

        <Button variant="ghost" onClick={onBack} disabled={busy}>
          ← Back to tree detail
        </Button>
      </aside>
    </div>
  );
}

function OrderPlacedStep({ placed, onCheckStatus }) {
  return (
    <div className="bento-card p-8 sm:p-10 max-w-2xl text-center space-y-5">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-leaf-100 text-leaf-700">
        <CheckCircle2 className="h-9 w-9" aria-hidden />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight">Order placed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you — a receipt is on its way to your inbox.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-secondary/30 p-5 text-left space-y-2">
        <Row label="No. of trees" value={`${placed.count}`} />
        <Row label="Amount" value={formatAmount(placed.total)} />
        <Row label="Date" value={formatDate(placed.date)} />
        {placed.siteName && <Row label="Site" value={placed.siteName} />}
        <Row label="Status" value="Yet to plant" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" onClick={onCheckStatus}>
          <MapPin className="h-4 w-4" /> Check status
        </Button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground">
        {value || '—'}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{value}</dd>
    </div>
  );
}

function RazorpayDisabledNotice() {
  return (
    <div className="bento-card border-amber-200 bg-amber-50 p-6 mb-5 flex items-start gap-3">
      <Info className="h-5 w-5 text-amber-600 shrink-0" aria-hidden />
      <div>
        <div className="font-heading text-sm font-semibold text-amber-900">
          Online payments aren't enabled yet
        </div>
        <p className="text-sm text-amber-900/80 mt-1">
          The NGO admin needs to add Razorpay keys to the server config before sponsors can pay
          online. In the meantime you can contribute offline — get in touch with the NGO.
        </p>
      </div>
    </div>
  );
}
