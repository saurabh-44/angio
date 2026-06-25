import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Field, GlassAuthScreen, PasswordField } from '@/components/GlassAuthScreen.jsx';
import { OtpInput } from '@/components/OtpInput.jsx';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { passwordStrength } from '@/lib/passwordStrength.js';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPasswordComplete } = useAuth();
  const { error: toastError, success } = useToast();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(location.state?.email ?? '');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: 'onTouched' });

  const pw = watch('newPassword', '');
  const strength = passwordStrength(pw);

  async function onSubmit(values) {
    if (otp.length !== 6) {
      toastError('Code is incomplete', 'Enter the 6-digit code we emailed you.');
      return;
    }
    setBusy(true);
    try {
      const me = await resetPasswordComplete({
        email: (email || values.email).trim(),
        otp,
        newPassword: values.newPassword,
      });
      success('Password updated', "You're signed in.");
      navigate(ROLE_HOME[me?.role] ?? '/', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Reset failed.';
      toastError("Couldn't reset password", msg);
      setOtp('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassAuthScreen
      title="Set a new password"
      subtitle="Enter the code we emailed you and choose a fresh password."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6 sm:mt-12" noValidate>
        {!location.state?.email && (
          <Field
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="Email ID"
            disabled={busy}
          />
        )}
        {location.state?.email && (
          <p className="text-sm text-white/80">
            Resetting for <span className="font-semibold text-white">{location.state.email}</span>
          </p>
        )}

        <div className="space-y-2.5">
          <span className="block text-sm text-white/80">6-digit code</span>
          <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus={!!location.state?.email} glass />
        </div>

        <div>
          <PasswordField
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            disabled={busy}
            error={errors.newPassword}
            {...register('newPassword', {
              required: 'Choose a password',
              minLength: { value: 8, message: '8 characters minimum' },
            })}
          />
          <div className="mt-3">
            <StrengthMeter strength={strength} />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Update password and sign in
        </button>

        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-white/90 underline underline-offset-4 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </form>
    </GlassAuthScreen>
  );
}

function StrengthMeter({ strength }) {
  const { score, label } = strength;
  const colors = ['bg-white/20', 'bg-red-300', 'bg-amber-300', 'bg-lime-300', 'bg-white'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : 'bg-white/20'}`}
          />
        ))}
      </div>
      {label && (
        <p className="text-xs text-white/70">
          Strength: <span className="font-medium text-white">{label}</span>
        </p>
      )}
    </div>
  );
}
