import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, MailCheck } from 'lucide-react';
import { Field, GlassAuthScreen } from '@/components/GlassAuthScreen.jsx';
import { api, ApiError } from '@/lib/api.js';
import { useToast } from '@/components/ui/toast.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { error: toastError, success } = useToast();
  const [sentEmail, setSentEmail] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  async function onSubmit(values) {
    try {
      const email = values.email.trim();
      await api.post('/api/auth/forgot-password', { email });
      success('Check your inbox', 'If the email is registered, we sent a reset code.');
      setSentEmail(email);
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not send reset email.';
      toastError("Couldn't request reset", msg);
    }
  }

  if (sentEmail) return null;

  return (
    <GlassAuthScreen
      title="Reset password"
      subtitle="Enter the email on your Environ account. We'll send you a 6-digit code."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-14 sm:mt-20" noValidate>
        <Field
          type="email"
          autoComplete="email"
          placeholder="Email ID"
          disabled={isSubmitting}
          error={errors.email}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
          })}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-10 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          Send reset code
        </button>

        <p className="mt-6 text-center text-sm">
          Remember it?{' '}
          <Link to="/login" className="font-semibold text-white underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </form>
    </GlassAuthScreen>
  );
}
