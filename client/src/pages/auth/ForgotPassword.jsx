import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, MailCheck } from 'lucide-react';
import AuthShell, { AuthFooterLink } from '@/components/AuthShell.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
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
    <AuthShell
      title="Reset password"
      subtitle="Enter the email on your Environ account. We'll send you a 6-digit code."
      footer={
        <AuthFooterLink to="/login" prefix="Remember it?" label="Back to sign in" />
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.org"
            disabled={isSubmitting}
            aria-invalid={errors.email ? 'true' : 'false'}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
            })}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          Send reset code
        </Button>
      </form>
    </AuthShell>
  );
}
