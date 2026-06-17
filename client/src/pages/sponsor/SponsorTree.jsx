import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Info,
  Leaf,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAuth } from '@/lib/auth.jsx';
import {
  useCreateSponsorOrder,
  useSponsorshipInfo,
  useVerifyPayment,
} from '@/queries/payments.js';
import { loadRazorpayScript, openRazorpayCheckout } from '@/lib/razorpay.js';
import { formatAmount } from '@/lib/format.js';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';

// Sponsor self-service "sponsor a tree" page. Three steps in a single
// view: pick how many trees, see the total, pay via Razorpay. After
// verification we bounce them to /sponsor/donations so they can watch
// their tree count grow as volunteers plant them.
export default function SponsorTree() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const info = useSponsorshipInfo();
  const createOrder = useCreateSponsorOrder();
  const verify = useVerifyPayment();

  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Preload the Razorpay script as soon as the page mounts so the
  // checkout opens instantly when the donor clicks pay.
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

  const unit = info.data?.unitPriceInr ?? 0;
  const total = count * unit;
  const razorpayReady = !!info.data?.razorpayEnabled;

  async function handlePay() {
    if (busy) return;
    setBusy(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toastError("Couldn't load payment SDK", 'Check your connection and try again.');
        return;
      }
      const orderRes = await createOrder.mutateAsync({
        treeCount: count,
        note: note.trim() || undefined,
      });
      const response = await openRazorpayCheckout({
        keyId: orderRes.razorpay.keyId,
        orderId: orderRes.razorpay.orderId,
        amount: orderRes.razorpay.amount,
        currency: orderRes.razorpay.currency,
        name: 'NGO Trees',
        description: `Sponsor ${count} ${count === 1 ? 'tree' : 'trees'}`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone ?? undefined },
      });
      await verify.mutateAsync({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      success(
        'Thank you for sponsoring trees!',
        'A receipt is on its way to your inbox. Watch your dashboard as volunteers plant them.',
      );
      navigate('/sponsor/donations');
    } catch (err) {
      if (err?.cancelled) {
        // User dismissed the modal before paying — nothing to apologise for.
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
      <PageHeader
        eyebrow="Sponsor trees"
        title="Plant a forest, one tree at a time"
        description="Choose how many trees you want to sponsor — we'll allocate them across our active sites and you'll see each one appear on your dashboard with photo proof as volunteers plant it."
      />

      {!razorpayReady && <RazorpayDisabledNotice />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <section className="lg:col-span-7 bento-card p-6 sm:p-8 space-y-6">
          <h2 className="font-heading text-base font-semibold">How many trees?</h2>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              disabled={count <= 1}
              aria-label="Decrease tree count"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min="1"
              max="1000"
              value={count}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) setCount(Math.max(1, Math.min(1000, Math.floor(next))));
              }}
              className="text-center font-heading text-2xl font-bold w-32 h-14"
              aria-label="Tree count"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setCount((c) => Math.min(1000, c + 1))}
              aria-label="Increase tree count"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground ml-2">
              {formatAmount(unit)} per tree
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 5, 10, 25, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer',
                  count === n
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:bg-secondary',
                )}
              >
                {n} {n === 1 ? 'tree' : 'trees'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Add a note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. in memory of someone, dedication, ..."
              maxLength={500}
            />
          </div>
        </section>

        <aside className="lg:col-span-5 space-y-4">
          <div className="bento-card surface-biophilic p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary font-medium">
              <Sparkles className="h-4 w-4" aria-hidden /> Your sponsorship
            </div>
            <div>
              <div className="font-heading text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
                {formatAmount(total)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {count} {count === 1 ? 'tree' : 'trees'} × {formatAmount(unit)}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full text-base"
              variant="accent"
              onClick={handlePay}
              disabled={busy || !razorpayReady}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Leaf className="h-4 w-4" />}
              {busy ? 'Opening checkout…' : `Pay ${formatAmount(total)}`}
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
              Secured by Razorpay. We never see your card details.
            </div>
          </div>

          <div className="bento-card p-6 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0" aria-hidden />
            <div className="text-sm text-muted-foreground leading-relaxed">
              Your donation is recorded immediately. The NGO admin allocates the trees across
              active sites, and you'll get a planting photo for each tree as volunteers put it in
              the ground — usually within 2–3 weeks of payment.
            </div>
          </div>
        </aside>
      </div>

      <ChainExplainer count={count} />
    </>
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
          The NGO admin needs to add Razorpay keys to the server config before donors can sponsor
          trees online. In the meantime you can contribute offline — get in touch with the NGO.
        </p>
      </div>
    </div>
  );
}

function ChainExplainer({ count }) {
  return (
    <div className="mt-8 bento-card p-6 sm:p-8">
      <h2 className="font-heading text-base font-semibold mb-1">What happens next?</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Every step is auditable on your dashboard — that's the whole point.
      </p>
      <ol className="space-y-4">
        <Step
          n="1"
          title="Payment confirmed"
          body="Razorpay verifies your card / UPI / netbanking and we record your donation as paid in seconds."
        />
        <Step
          n="2"
          title="NGO allocates"
          body={`The NGO admin distributes your ${count} ${count === 1 ? 'tree' : 'trees'} across one or more active sites with a target plant count per site.`}
        />
        <Step
          n="3"
          title="Volunteers plant + photograph"
          body="On the ground, volunteers go to the site and plant each tree, recording GPS + a photo for every single one. You see them on your dashboard as soon as they're submitted."
        />
        <Step
          n="4"
          title="Weekly maintenance proof"
          body="A fresh watering photo per tree, every week. The donor map updates live."
          last
        />
      </ol>
    </div>
  );
}

function Step({ n, title, body, last }) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-mono text-xs font-semibold">
          {n}
        </span>
        {!last && <span className="w-px flex-1 bg-border my-2" aria-hidden />}
      </div>
      <div className="pb-2 pt-0.5">
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </li>
  );
}
