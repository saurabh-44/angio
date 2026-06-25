import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, ShieldCheck } from 'lucide-react';
import { GlassAuthScreen, PasswordField } from '@/components/GlassAuthScreen.jsx';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { passwordStrength } from '@/lib/passwordStrength.js';

export default function ChangePassword() {
  const { user, changePassword, logout, mustChangePassword } = useAuth();
  const { error: toastError, success } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const pw = watch('newPassword', '');
  const strength = passwordStrength(pw);

  async function onSubmit(values) {
    if (values.newPassword !== values.confirmPassword) {
      toastError('Passwords do not match', 'Re-enter the new password.');
      return;
    }
    try {
      const me = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      success('Password updated', "You're all set.");
      navigate(ROLE_HOME[me?.role] ?? '/', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Update failed.';
      toastError("Couldn't change password", msg);
    }
  }

  const title = mustChangePassword ? 'Set your password' : 'Change password';
  const subtitle = mustChangePassword
    ? 'Welcome! For security, choose a new password before continuing.'
    : 'Pick a new password. Other devices signed in with the old one will be signed out.';

  return (
    <GlassAuthScreen title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6 sm:mt-12" noValidate>
        <div className="rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm text-white/85">
          Signed in as <span className="font-semibold text-white">{user?.email}</span>
        </div>

        <PasswordField
          placeholder="Current password"
          autoComplete="current-password"
          disabled={isSubmitting}
          error={errors.currentPassword}
          {...register('currentPassword', { required: 'Required' })}
        />

        <div>
          <PasswordField
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={errors.newPassword}
            {...register('newPassword', {
              required: 'Choose a new password',
              minLength: { value: 8, message: '8 characters minimum' },
            })}
          />
          {pw && (
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < strength.score
                      ? ['bg-white/20', 'bg-red-300', 'bg-amber-300', 'bg-lime-300', 'bg-white'][
                          strength.score
                        ]
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <PasswordField
          placeholder="Confirm new password"
          autoComplete="new-password"
          disabled={isSubmitting}
          error={errors.confirmPassword}
          {...register('confirmPassword', { required: 'Re-enter the new password' })}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {mustChangePassword ? 'Set password' : 'Update password'}
        </button>

        <p className="text-center text-sm">
          <button
            type="button"
            onClick={logout}
            className="font-medium text-white/80 underline underline-offset-4 hover:text-white"
          >
            Sign out instead
          </button>
        </p>
      </form>
    </GlassAuthScreen>
  );
}
