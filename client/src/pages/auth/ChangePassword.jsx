import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import AuthShell from '@/components/AuthShell.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { passwordStrength } from '@/lib/passwordStrength.js';

export default function ChangePassword() {
  const { user, changePassword, logout, mustChangePassword } = useAuth();
  const { error: toastError, success } = useToast();
  const navigate = useNavigate();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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
      toastError('Passwords do not match', "Re-enter the new password.");
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
    ? "Welcome! For security, choose a new password before continuing."
    : 'Pick a new password. Other devices signed in with the old one will be signed out.';

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      footer={
        <button
          type="button"
          onClick={logout}
          className="text-sm text-muted-foreground hover:text-foreground underline cursor-pointer"
        >
          Sign out instead
        </button>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
          Signed in as <span className="font-medium">{user?.email}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              className="pr-11"
              {...register('currentPassword', { required: 'Required' })}
            />
            <PwToggle shown={showCurrent} onClick={() => setShowCurrent((s) => !s)} />
          </div>
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={isSubmitting}
              className="pr-11"
              {...register('newPassword', {
                required: 'Choose a new password',
                minLength: { value: 8, message: '8 characters minimum' },
              })}
            />
            <PwToggle shown={showNew} onClick={() => setShowNew((s) => !s)} />
          </div>
          {pw && (
            <div className="flex gap-1.5 pt-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < strength.score
                      ? ['bg-muted', 'bg-destructive', 'bg-amber-400', 'bg-leaf-400', 'bg-primary'][
                          strength.score
                        ]
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
          {errors.newPassword && (
            <p className="text-xs text-destructive">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            disabled={isSubmitting}
            {...register('confirmPassword', { required: 'Re-enter the new password' })}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {mustChangePassword ? 'Set password' : 'Update password'}
        </Button>
      </form>
    </AuthShell>
  );
}

function PwToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
