import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { Field, GlassAuthScreen, PasswordField } from '@/components/GlassAuthScreen.jsx';

// Figma "Login". Sign in with email OR phone + password. Sponsors/volunteers
// using a phone number skip the email OTP; everyone else is sent to /login/verify.
export default function Login() {
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = location.state?.from?.pathname ?? null;

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
    <GlassAuthScreen
      title="Login"
      subtitle={
        <>
          Do not have an account?{' '}
          <Link to="/register" className="font-semibold text-white underline underline-offset-4">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-14 sm:mt-20" noValidate>
        <div className="space-y-8">
          <Field
            placeholder="Email ID / Phone Number"
            autoComplete="username"
            error={errors.identifier}
            {...register('identifier', { required: 'Email or phone is required' })}
          />
          <PasswordField
            placeholder="Password*"
            autoComplete="current-password"
            error={errors.password}
            {...register('password', { required: 'Password is required' })}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-10 w-full rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>

        <p className="mt-6 text-center text-sm">
          <Link
            to="/forgot-password"
            className="font-medium text-white/90 underline underline-offset-4 hover:text-white"
          >
            Forgot password?
          </Link>
        </p>
      </form>
    </GlassAuthScreen>
  );
}
