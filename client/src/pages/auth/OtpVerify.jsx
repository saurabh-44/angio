import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { GlassAuthScreen } from '@/components/GlassAuthScreen.jsx';
import { OtpInput } from '@/components/OtpInput.jsx';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';

export default function OtpVerify() {
  const { pendingOtpEmail, verifyLoginOtp } = useAuth();
  const { error: toastError, info } = useToast();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);

  // Direct hits to /login/verify with no in-flight login → bounce back.
  if (!pendingOtpEmail) {
    return <Navigate to="/login" replace />;
  }

  async function submit(e) {
    e?.preventDefault();
    if (otp.length !== 6 || busy) return;
    setBusy(true);
    try {
      const me = await verifyLoginOtp({ otp });
      // Resume a sponsor's in-flight order if they came from the hero
      // (tree count stashed before signup). The wizard reads + clears it.
      const pendingOrder = sessionStorage.getItem('pendingSponsorTrees');
      const dest =
        pendingOrder && me?.role === 'sponsor' ? '/sponsor/sponsor' : ROLE_HOME[me?.role] ?? '/';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not verify code.';
      toastError('Verification failed', msg);
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassAuthScreen
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-white">{pendingOtpEmail}</span>. Codes expire in 5
          minutes.
        </>
      }
    >
      <form onSubmit={submit} className="mt-12 space-y-7 sm:mt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white/90">
          <MailCheck className="h-4 w-4" aria-hidden /> Code sent
        </div>

        <OtpInput value={otp} onChange={setOtp} disabled={busy} glass />

        <button
          type="submit"
          disabled={otp.length !== 6 || busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify and continue
        </button>

        <p className="text-center text-xs text-white/70">
          Didn't get a code? Check spam, or{' '}
          <button
            type="button"
            onClick={() => info('Resend not wired yet', 'Use the original code if it is still valid.')}
            className="cursor-pointer font-medium text-white underline underline-offset-4"
          >
            request a new one
          </button>
          .
        </p>

        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-white/90 underline underline-offset-4 hover:text-white">
            Use a different email
          </Link>
        </p>
      </form>
    </GlassAuthScreen>
  );
}
