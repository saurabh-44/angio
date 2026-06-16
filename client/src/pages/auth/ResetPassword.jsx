import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import AuthShell from '@/components/AuthShell.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
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
  const [showPw, setShowPw] = useState(false);
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
    <AuthShell
      title="Set a new password"
      subtitle="Enter the code we emailed you and choose a fresh password."
      footer={
        <Link to="/login" className="text-primary hover:underline font-medium">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {!location.state?.email && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.org"
              disabled={busy}
            />
          </div>
        )}
        {location.state?.email && (
          <div className="text-sm text-muted-foreground">
            Resetting for{' '}
            <span className="font-medium text-foreground">{location.state.email}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label>6-digit code</Label>
          <OtpInput value={otp} onChange={setOtp} disabled={busy} autoFocus={!!location.state?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled={busy}
              aria-invalid={errors.newPassword ? 'true' : 'false'}
              className="pr-11"
              {...register('newPassword', {
                required: 'Choose a password',
                minLength: { value: 8, message: '8 characters minimum' },
              })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <StrengthMeter strength={strength} />
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Update password and sign in
        </Button>
      </form>
    </AuthShell>
  );
}

function StrengthMeter({ strength }) {
  const { score, label } = strength;
  const colors = ['bg-muted', 'bg-destructive', 'bg-amber-400', 'bg-leaf-400', 'bg-primary'];
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score] : 'bg-muted'}`}
          />
        ))}
      </div>
      {label && (
        <p className="text-xs text-muted-foreground">
          Strength: <span className="font-medium text-foreground">{label}</span>
        </p>
      )}
    </div>
  );
}
