import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';
import { Field, FieldWrap, GlassAuthScreen, PasswordField, inputCls } from '@/components/GlassAuthScreen.jsx';

// Figma "Create Account". All validation/logic is unchanged — the account is
// created only after the email OTP is verified.
export default function Register() {
  const { register: registerAccount } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  async function onSubmit(values) {
    try {
      const res = await registerAccount({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        dob: values.dob || undefined,
        gender: values.gender || undefined,
        password: values.password,
      });
      if (res?.requiresOtp) {
        navigate('/login/verify');
        return;
      }
      navigate(ROLE_HOME[res.user?.role] ?? '/', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      toastError('Could not create account', msg);
    }
  }

  // Date field: a real <input type="date"> so tapping opens the native picker
  // on iOS/Android (showPicker() is unavailable in the Capacitor WebView). Its
  // own value text is hidden while empty so "Date Of Birth" shows as a
  // placeholder; the input stays tappable underneath.
  const dobField = register('dob', { required: 'Required' });
  const dob = watch('dob');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <GlassAuthScreen
      title="Create Account"
      subtitle="Create your account and be part of the mission."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-14 sm:mt-20" noValidate>
        {/* Two columns on every width so short fields (name, DOB, gender) pair
            up and the form stays compact on mobile. Long fields span the full
            width on mobile but drop back to half-width at sm+ (desktop). */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-6">
          <Field
            placeholder="First Name*"
            autoComplete="given-name"
            error={errors.firstName}
            {...register('firstName', { required: 'Required' })}
          />
          <Field
            placeholder="Last Name*"
            autoComplete="family-name"
            error={errors.lastName}
            {...register('lastName', { required: 'Required' })}
          />

          {/* Date of birth — same styling/height as the other auth fields
              (inputCls). A real <input type="date"> so tapping opens the native
              picker; its value text is hidden while empty so the "Date Of Birth"
              overlay reads as a placeholder. */}
          <FieldWrap error={errors.dob}>
            <div className="relative">
              {!dob && (
                <span className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden whitespace-nowrap text-base text-white/70">
                  Date Of Birth
                </span>
              )}
              <input
                {...dobField}
                type="date"
                max={today}
                className={cn(inputCls, 'min-w-0', !dob && 'text-transparent')}
              />
            </div>
          </FieldWrap>

          {/* Gender — inputCls with appearance-none so the native <select>
              chrome/centering is removed and its text lines up with the date
              field on the same row. */}
          <FieldWrap error={errors.gender}>
            <div className="relative">
              <select
                defaultValue=""
                {...register('gender', { required: 'Required' })}
                className={cn(inputCls, 'min-w-0 cursor-pointer appearance-none pr-6 [&>option]:text-black')}
              >
                <option value="" disabled>
                  Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1 h-4 w-4 text-white/70"
                aria-hidden
              />
            </div>
          </FieldWrap>

          <div className="col-span-2 sm:col-span-1">
            <Field
              type="email"
              placeholder="Email ID*"
              autoComplete="email"
              error={errors.email}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
              })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field
              type="tel"
              placeholder="Phone Number*"
              autoComplete="tel"
              error={errors.phone}
              {...register('phone', {
                required: 'Phone is required',
                minLength: { value: 4, message: 'Enter a valid phone' },
              })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <PasswordField
              placeholder="Create Password*"
              autoComplete="new-password"
              error={errors.password}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <PasswordField
              placeholder="Confirm Password*"
              autoComplete="new-password"
              error={errors.confirmPassword}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === watch('password') || 'Passwords do not match',
              })}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-10 w-full rounded-full border border-white/40 bg-white/25 py-4 text-base font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/35 disabled:opacity-60"
        >
          {isSubmitting ? 'Creating…' : 'Create Profile'}
        </button>

        <p className="mt-5 text-center text-sm text-white/80">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-white underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </GlassAuthScreen>
  );
}
