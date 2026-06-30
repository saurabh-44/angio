import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Gift,
  Info,
  Loader2,
  ShieldCheck,
  TreePine,
  Trees,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
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
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';
import paymentMethods from '@/assets/payment-methods.png';

const ANY_SITE = '__any__';
const STEPS = ['Contribution Type', 'Plantation Details', 'Details', 'Report'];

// Contribution types (step 1). They only shape the order's tree count + tag;
// the actual order/payment is created later by the unchanged Razorpay flow.
const CONTRIB_TYPES = [
  {
    id: 'single',
    icon: TreePine,
    title: 'Single Tree',
    desc: 'Sponsor one tree and follow it from planting to full canopy with GPS + photo proof.',
  },
  {
    id: 'multiple',
    icon: Trees,
    title: 'Multiple Trees',
    desc: 'Fund several trees at once — the NGO can split them across available planting sites.',
  },
  {
    id: 'event',
    icon: Gift,
    title: 'Event Special (Custom Tag)',
    desc: 'Dedicate a planting to a birthday, anniversary, or memory with a custom tag.',
  },
];

// Sponsor self-service order wizard. 4 steps in one route:
//   1. Contribution Type — single / multiple / event.
//   2. Plantation Details — site (optional), how many, donation date.
//   3. Details — auto-filled contact + billing, pay via Razorpay.
//   4. Report — summary + link to track status.
// A tree count stashed by the public hero (pendingSponsorTrees) prefills the
// count and is cleared on mount.
export default function SponsorTree() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const info = useSponsorshipInfo();
  const sites = useAvailableSites();
  const createOrder = useCreateSponsorOrder();
  const verify = useVerifyPayment();

  const [step, setStep] = useState(1);
  const [contributionType, setContributionType] = useState('single');
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
    if (Number.isFinite(trees) && trees >= 1) {
      setCount(Math.min(1000, Math.floor(trees)));
      if (trees > 1) setContributionType('multiple');
    }
    const pendingNote = sessionStorage.getItem('pendingSponsorNote');
    if (pendingNote) {
      setNote(pendingNote);
      setContributionType('event');
    }
    sessionStorage.removeItem('pendingSponsorTrees');
    sessionStorage.removeItem('pendingSponsorNote');
  }, []);

  useEffect(() => {
    if (info.data?.razorpayEnabled) loadRazorpayScript();
  }, [info.data?.razorpayEnabled]);

  if (info.isLoading) {
    return (
      <div style={{ fontFamily: BODY_FONT }}>
        <ContributeHeading count={count} />
        <Skeleton className="mx-auto mt-8 h-72 w-full max-w-6xl" />
      </div>
    );
  }

  const availableSites = sites.data?.items ?? [];
  const selectedSite = siteId !== ANY_SITE ? availableSites.find((s) => s.id === siteId) : null;
  const globalUnit = info.data?.unitPriceInr ?? 0;
  const unit = selectedSite?.pricePerTreeInr ?? globalUnit;
  const total = count * unit;
  const razorpayReady = !!info.data?.razorpayEnabled;

  // Step 1 → 2. Single locks the count to one tree.
  function selectType(id) {
    setContributionType(id);
    if (id === 'single') setCount(1);
  }
  function goToPlantation() {
    if (contributionType === 'single') setCount(1);
    setStep(2);
  }

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
    setStep(3);
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
      setStep(4);
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

  // "Contribute Again" — reset the wizard for a fresh order.
  function contributeAgain() {
    setPlaced(null);
    setContributionType('single');
    setCount(1);
    setSiteId(ANY_SITE);
    setNote('');
    setDonationDate(new Date().toISOString().slice(0, 10));
    setStep(1);
  }

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <ContributeHeading count={count} />

      <div className="mx-auto max-w-6xl">
        <StepBar step={step} />

        {!razorpayReady && (step === 2 || step === 3) && <RazorpayDisabledNotice />}

      {step === 1 && (
        <ContributionTypeStep value={contributionType} onSelect={selectType} onNext={goToPlantation} />
      )}

      {step === 2 && (
        <TreeDetailStep
          count={count}
          setCount={setCount}
          lockCount={contributionType === 'single'}
          isEvent={contributionType === 'event'}
          siteId={siteId}
          setSiteId={setSiteId}
          donationDate={donationDate}
          setDonationDate={setDonationDate}
          note={note}
          setNote={setNote}
          unit={unit}
          availableSites={availableSites}
          sitesLoading={sites.isLoading}
          onBack={() => setStep(1)}
          onNext={goToBilling}
        />
      )}

      {step === 3 && (
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
          onBack={() => setStep(2)}
          onPay={handlePay}
        />
      )}

      {step === 4 && placed && (
          <OrderPlacedStep
            placed={placed}
            onContributeAgain={contributeAgain}
            onExit={() => navigate('/sponsor/orders')}
          />
        )}
      </div>
    </div>
  );
}

// "Contribute • N" heading (Figma).
function ContributeHeading({ count }) {
  return (
    <PageHeading>
      <h1 className="text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        Contribute <span className="font-normal">•&nbsp;{count}</span>
      </h1>
    </PageHeading>
  );
}

// Step 1 — choose a contribution type. Selecting a card highlights it and
// reveals the arrow; clicking the arrow advances.
function ContributionTypeStep({ value, onSelect, onNext }) {
  return (
    <div>
      <div className="max-w-lg">
        <h2 className="text-2xl font-medium text-[#001F00]">Select Contribution Type</h2>
        <p className="mt-2 text-base leading-[21px] tracking-[0.01em] text-[#1E1E1E]/50">
          Select the type of tree donation as per your preferences.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        {CONTRIB_TYPES.map((t) => {
          const selected = value === t.id;
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-[10px] border p-4 transition-colors sm:gap-6 sm:p-5',
                selected ? 'border-[#001F00]' : 'border-[#E2E8F0] hover:border-[#001F00]/40',
              )}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#0B5000]/10 text-[#0B5000] sm:h-[88px] sm:w-[88px]">
                <t.icon className="h-7 w-7 sm:h-10 sm:w-10" aria-hidden strokeWidth={1.5} />
              </span>
              <span className="hidden h-2 w-2 shrink-0 bg-[#001F00] sm:block" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-medium text-[#001F00] sm:text-2xl">{t.title}</div>
                <p className="mt-1 text-sm leading-snug tracking-[0.01em] text-[#1E1E1E]/50 sm:mt-1.5 sm:text-base sm:leading-[21px]">
                  {t.desc}
                </p>
              </div>
              {selected && (
                <button
                  type="button"
                  aria-label={`Continue with ${t.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#001F00] text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white sm:h-[72px] sm:w-[72px]"
                >
                  <ArrowIcon className="h-4 w-4 sm:w-5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Figma arrow glyph (from Environ_icon/→.svg).
function ArrowIcon({ className = 'h-3.5 w-4' }) {
  return (
    <svg viewBox="0 0 18 14" className={className} fill="currentColor" aria-hidden>
      <path d="M10.392 13.872L8.616 12.12L12.528 8.232H0V5.64H12.528L8.616 1.776L10.392 0L17.304 6.936L10.392 13.872Z" />
    </svg>
  );
}

// Back button that sits in the left margin so the step heading lines up with
// the content below it (falls back to inline on narrow screens).
function StepBackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="absolute -left-14 top-1 grid h-9 w-9 place-items-center rounded-full border border-[#001F00] text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white max-lg:static max-lg:mb-4 lg:h-10 lg:w-10"
    >
      <ArrowIcon className="h-3.5 w-4 rotate-180" />
    </button>
  );
}

// Order price summary (shared by Plantation Details + Confirm Details). Tax is
// ₹0 — the backend charges count × unit only.
function PriceCard({ unit, count, total }) {
  return (
    <div className="w-full max-w-[512px] rounded-[10px] bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.12)] lg:p-7">
      <h3 className="text-xl font-medium text-[#001F00] lg:text-2xl">Price</h3>
      <dl className="mt-4 space-y-3 text-base text-[#1E1E1E] lg:mt-6 lg:space-y-[18px]">
        <div className="flex justify-between">
          <dt>Cost per Tree</dt>
          <dd>{formatAmount(unit)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Trees Order</dt>
          <dd>x{count}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Tax</dt>
          <dd>{formatAmount(0)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-between border-t border-[#E2E8F0] pt-4 text-base font-medium text-[#1E1E1E] lg:mt-6 lg:pt-5">
        <span>Subtotal</span>
        <span>{formatAmount(total)}</span>
      </div>
      <div className="mt-5 flex flex-col items-center gap-1.5 lg:mt-8">
        <img src={paymentMethods} alt="Accepted payment methods" className="h-9 w-auto" />
        <span className="text-xs text-[#1E1E1E]/80">Accepted Payment Methods</span>
      </div>
    </div>
  );
}

function StepBar({ step }) {
  return (
    <div className="my-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 sm:gap-x-5 lg:my-9">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n <= step;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-5">
            <div
              className={cn(
                'flex items-center gap-3',
                active ? 'text-[#1E1E1E]' : 'text-[#B4B4B4]',
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs',
                  active ? 'border-[#1E1E1E]' : 'border-[#B4B4B4]',
                )}
              >
                {n}
              </span>
              <span className="hidden text-xs sm:inline">{label}</span>
            </div>
            {n < STEPS.length && (
              <span
                className="block h-px w-5 border-t border-dashed border-[#B4B4B4] sm:w-12"
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TreeDetailStep({
  count,
  setCount,
  lockCount,
  isEvent,
  siteId,
  setSiteId,
  donationDate,
  setDonationDate,
  note,
  setNote,
  unit,
  availableSites,
  sitesLoading,
  onBack,
  onNext,
}) {
  const [countDraft, setCountDraft] = useState(String(count));
  const [editing, setEditing] = useState(false);
  // Mirror count into the field from outside (preset, +/-) — but never while
  // typing, so the user can clear "1" and enter a new value freely.
  useEffect(() => {
    if (!editing) setCountDraft(String(count));
  }, [count, editing]);

  const selectedSite = siteId !== ANY_SITE ? availableSites.find((s) => s.id === siteId) : null;
  const overCapacity =
    selectedSite && selectedSite.remaining != null && count > selectedSite.remaining;
  const total = count * unit;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="relative">
      <StepBackButton onClick={onBack} />

      <h2 className="text-2xl font-medium text-[#001F00]">Fill Plantation Details</h2>
      <p className="mt-2 text-base leading-[21px] tracking-[0.01em] text-[#1E1E1E]/50">
        Note: Once the order is placed, this information cannot be changed
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-10">
        {/* Left — form */}
        <div className="flex max-w-[520px] flex-col gap-5 lg:gap-8">
          <Select value={siteId} onValueChange={setSiteId} disabled={sitesLoading}>
            <SelectTrigger className="h-auto rounded-[10px] border-[#B4B4B4] px-5 py-3 text-base text-[#1E1E1E] transition-colors focus:border-[#0B5000] focus:ring-0 focus:ring-offset-0 lg:py-4">
              <SelectValue placeholder={sitesLoading ? 'Loading sites…' : 'Select Site (optional)'} />
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

          {/* Tree count */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <span className="text-base text-[#1E1E1E]">Select Number of Trees</span>
            <div className="flex w-full items-center justify-between rounded-[10px] border border-[#B4B4B4] px-5 py-3 transition-colors focus-within:border-[#0B5000] lg:w-[182px] lg:py-3.5">
              <button
                type="button"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                disabled={lockCount || count <= 1}
                aria-label="Decrease"
                className="text-xl leading-none text-black transition-opacity disabled:opacity-30"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={countDraft}
                disabled={lockCount}
                aria-label="Tree count"
                onFocus={() => setEditing(true)}
                onChange={(e) => {
                  const t = e.target.value;
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
                className="w-12 bg-transparent text-center text-base text-[#1E1E1E] outline-none disabled:opacity-100"
              />
              <button
                type="button"
                onClick={() => setCount((c) => Math.min(1000, c + 1))}
                disabled={lockCount}
                aria-label="Increase"
                className="text-xl leading-none text-black transition-opacity disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          {/* Donation date */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <span className="text-base text-[#1E1E1E]">Set Donation Date</span>
            <DateField value={donationDate} max={today} onChange={setDonationDate} />
          </div>

          {/* Event custom tag */}
          {isEvent && (
            <label className="flex flex-col gap-2">
              <span className="text-base text-[#1E1E1E]">Custom tag</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                placeholder="e.g. Happy Birthday, Aanya!"
                className="rounded-[10px] border border-[#B4B4B4] px-5 py-3.5 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]"
              />
            </label>
          )}

          {overCapacity && (
            <p className="text-sm text-amber-600">
              {selectedSite.name} has room for only {selectedSite.remaining} more tree
              {selectedSite.remaining === 1 ? '' : 's'}. Reduce the count or choose “Any site”.
            </p>
          )}
        </div>

        {/* Right — price */}
        <PriceCard unit={unit} count={count} total={total} />
      </div>

      <hr className="mt-6 border-t border-black/70 lg:mt-10" />
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-3xl text-sm leading-snug tracking-[0.01em] text-[#1E1E1E] lg:text-base lg:leading-[21px]">
          We prioritise the site you prefer to plant a tree. Please note we might not be able to
          fully/partially allocate the trees to a site if the site runs out of land to plant more trees.
        </p>
        <Button size="lg" onClick={onNext} disabled={overCapacity} className="w-full shrink-0 lg:w-auto">
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Bordered date box (Figma): calendar icon + formatted date; clicking opens
// the native picker via a transparent overlay input.
function DateField({ value, max, onChange }) {
  const ref = useRef(null);
  return (
    <div
      onClick={() => {
        const el = ref.current;
        if (el?.showPicker) el.showPicker();
        else el?.focus();
      }}
      className="relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-[10px] border border-[#B4B4B4] px-5 py-3 transition-colors focus-within:border-[#0B5000] lg:w-[182px] lg:py-3.5"
    >
      <Calendar className="h-5 w-5 shrink-0 text-[#1E1E1E]" aria-hidden />
      <span className="whitespace-nowrap text-base text-[#1E1E1E]">
        {value ? formatDate(value) : 'Select'}
      </span>
      <input
        ref={ref}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        aria-label="Donation date"
        tabIndex={-1}
      />
    </div>
  );
}

// Step 3 — Confirm Details: read-only contact, editable billing address, and
// the Price card + Place Order (fires the unchanged Razorpay flow).
function BillingStep({ user, count, unit, total, busy, razorpayReady, address, setAddress, saveAddress, setSaveAddress, onBack, onPay }) {
  const field = (key) => (e) => setAddress((a) => ({ ...a, [key]: e.target.value }));
  const box =
    'w-full rounded-[10px] border border-[#B4B4B4] px-5 py-4 text-base text-[#1E1E1E] outline-none transition-colors placeholder:text-[#B4B4B4] focus:border-[#0B5000]';

  return (
    <div className="relative">
      <StepBackButton onClick={onBack} />

      <h2 className="text-2xl font-medium text-[#001F00]">Confirm Details</h2>
      <p className="mt-2 text-base leading-[21px] tracking-[0.01em] text-[#1E1E1E]/50">
        Note: Once the order is placed, this information cannot be changed
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-10">
        {/* Left — contact (read-only) + address */}
        <div className="flex max-w-[530px] flex-col gap-5">
          <input value={user?.name ?? ''} readOnly aria-label="Name" className={cn(box, 'bg-[#001F00]/[0.03]')} />
          <input value={user?.email ?? ''} readOnly placeholder="Email ID" aria-label="Email" className={cn(box, 'bg-[#001F00]/[0.03]')} />
          <input value={user?.phone ?? ''} readOnly placeholder="Phone number" aria-label="Phone" className={cn(box, 'bg-[#001F00]/[0.03]')} />
          <input value={address.line1} onChange={field('line1')} placeholder="Address" disabled={busy} aria-label="Address" className={box} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <input value={address.country} onChange={field('country')} placeholder="Country" disabled={busy} aria-label="Country" className={box} />
            <input value={address.state} onChange={field('state')} placeholder="State" disabled={busy} aria-label="State" className={box} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <input value={address.city} onChange={field('city')} placeholder="City" disabled={busy} aria-label="City" className={box} />
            <input value={address.pinCode} onChange={field('pinCode')} placeholder="Pin Code" inputMode="numeric" disabled={busy} aria-label="Pin code" className={box} />
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[#1E1E1E]">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 rounded border-[#001F00] accent-[#0B5000]"
            />
            Save this address for next time
          </label>
        </div>

        {/* Right — price + place order */}
        <div className="flex max-w-[512px] flex-col gap-5">
          <PriceCard unit={unit} count={count} total={total} />
          <button
            type="button"
            onClick={onPay}
            disabled={busy || !razorpayReady}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#346EC4] px-5 py-4 text-base font-semibold text-[#F8FDFF] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {busy ? 'Opening checkout…' : 'Place Order'}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs text-[#1E1E1E]/70">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Secured by Razorpay — we never see your card details.
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 4 — Report: thank-you + order summary, then Contribute Again / Download.
function OrderPlacedStep({ placed, onContributeAgain, onExit }) {
  const blueBtn =
    'rounded-[10px] bg-[#346EC4] px-5 py-4 text-center text-base font-semibold text-[#F8FDFF] transition-opacity hover:opacity-90';
  return (
    <div className="relative">
      <StepBackButton onClick={onExit} />

      <h2 className="text-2xl font-medium text-[#001F00]">Report</h2>
      <p className="mt-2 text-base leading-[21px] tracking-[0.01em] text-[#1E1E1E]/50">
        Thank you for contributing to nature! We&apos;ll be planting trees on your behalf.
      </p>

      {/* Order summary report */}
      <div className="mt-8 rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] px-6 py-10 sm:px-10">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0B5000]/10 text-[#0B5000]">
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-[#001F00]">Order placed</h3>
          <p className="mt-1 text-sm text-[#1E1E1E]/60">A receipt is on its way to your inbox.</p>
        </div>
        <dl className="mx-auto mt-8 max-w-md space-y-3 text-base text-[#1E1E1E]">
          <Row label="No. of trees" value={`${placed.count}`} />
          <Row label="Amount" value={formatAmount(placed.total)} />
          <Row label="Date" value={formatDate(placed.date)} />
          {placed.siteName && <Row label="Site" value={placed.siteName} />}
          <Row label="Status" value="Yet to plant" />
        </dl>
      </div>

      {/* Actions */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <button type="button" onClick={onContributeAgain} className={blueBtn}>
          Contribute Again
        </button>
        <a
          href="/api/certificates/plantation.pdf"
          download="plantation-report.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={blueBtn}
        >
          Download PDF
        </a>
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
    <div className="mb-5 flex items-start gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-6">
      <Info className="h-5 w-5 text-amber-600 shrink-0" aria-hidden />
      <div>
        <div className="text-sm font-semibold text-amber-900">
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
