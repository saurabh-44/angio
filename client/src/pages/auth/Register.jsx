import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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

  // Date field: starts as text (so "Date Of Birth" shows as a placeholder),
  // switches to a real date picker on focus.
  const dobField = register('dob', { required: 'Required' });

  return (
    <GlassAuthScreen
      title="Create Account"
      subtitle="Create your account and be part of the mission."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-14 sm:mt-20" noValidate>
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
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

          {/* Date of birth */}
          <FieldWrap error={errors.dob}>
            <input
              {...dobField}
              type="text"
              placeholder="Date Of Birth"
              max={new Date().toISOString().slice(0, 10)}
              onFocus={(e) => {
                e.currentTarget.type = 'date';
                if (e.currentTarget.showPicker) e.currentTarget.showPicker();
              }}
              onBlur={(e) => {
                if (!e.currentTarget.value) e.currentTarget.type = 'text';
                dobField.onBlur(e);
              }}
              className={inputCls}
            />
          </FieldWrap>

          {/* Gender */}
          <FieldWrap error={errors.gender}>
            <select
              defaultValue=""
              {...register('gender', { required: 'Required' })}
              className={cn(inputCls, '[&>option]:text-black')}
            >
              <option value="" disabled>
                Gender
              </option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </FieldWrap>

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
          <PasswordField
            placeholder="Create Password*"
            autoComplete="new-password"
            error={errors.password}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
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
