import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import AuthShell from '@/components/AuthShell.jsx';
import { Button } from '@/components/ui/button.jsx';
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
      const dest = ROLE_HOME[me?.role] ?? '/';
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
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-medium text-foreground">{pendingOtpEmail}</span>.
          Enter it below — codes expire in 5 minutes.
        </>
      }
      footer={
        <Link to="/login" className="text-primary hover:underline font-medium">
          Use a different email
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-secondary/70 py-3 px-4 text-sm text-secondary-foreground">
          <MailCheck className="h-4 w-4" aria-hidden />
          Code sent
        </div>

        <OtpInput value={otp} onChange={setOtp} disabled={busy} />

        <Button type="submit" size="lg" className="w-full" disabled={otp.length !== 6 || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Verify and continue
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Didn't get a code? Check spam, or{' '}
          <button
            type="button"
            onClick={() => info('Resend not wired yet', 'Use the original code if it is still valid.')}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            request a new one
          </button>
          .
        </p>
      </form>
    </AuthShell>
  );
}
