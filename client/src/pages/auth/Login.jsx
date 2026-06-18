import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthShell from '@/components/AuthShell.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';

export default function Login() {
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname ?? null;
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  async function onSubmit(values) {
    try {
      const res = await login({ identifier: values.identifier.trim(), password: values.password });
      if (res.requiresOtp) {
        navigate('/login/verify');
        return;
      }
      const dest = fromPath ?? ROLE_HOME[res.user?.role] ?? '/';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      toastError('Could not sign in', msg);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your trees — every planting photo, GPS pin, and update."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or phone</Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            placeholder="you@example.org or phone number"
            disabled={isSubmitting}
            aria-invalid={errors.identifier ? 'true' : 'false'}
            {...register('identifier', { required: 'Email or phone is required' })}
          />
          {errors.identifier && (
            <p className="text-xs text-destructive">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isSubmitting}
              aria-invalid={errors.password ? 'true' : 'false'}
              className="pr-11"
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>

        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span className="text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create a sponsor account
            </Link>
          </span>
          <Link
            to="/forgot-password"
            className="shrink-0 font-medium text-primary hover:underline whitespace-nowrap"
          >
            Reset password
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
