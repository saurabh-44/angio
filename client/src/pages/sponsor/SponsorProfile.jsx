import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { api, ApiError } from '@/lib/api.js';
import { uploadPhoto } from '@/queries/uploads.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

const GENDERS = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
  ['prefer_not_to_say', 'Prefer not to say'],
];

const underline =
  'w-full border-b border-[#1E1E1E]/60 bg-transparent pb-2 text-base text-[#1E1E1E] outline-none transition-colors focus:border-[#0B5000] disabled:opacity-60 [color-scheme:light]';

function initials(name) {
  return (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm text-[#1E1E1E]/60">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error.message}</span>}
    </label>
  );
}

export default function SponsorProfile() {
  const { user, refetchMe } = useAuth();
  const { success, error: toastError } = useToast();

  // Seed accounts have only `name` — split it so the fields aren't empty.
  const parts = (user?.name ?? '').trim().split(/\s+/).filter(Boolean);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: {
      firstName: user?.firstName ?? parts[0] ?? '',
      lastName: user?.lastName ?? parts.slice(1).join(' ') ?? '',
      dob: user?.dob ? user.dob.slice(0, 10) : '',
      gender: user?.gender ?? '',
    },
  });

  async function onSubmit(values) {
    try {
      await api.patch('/api/auth/me', {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dob: values.dob || null,
        gender: values.gender || null,
      });
      await refetchMe();
      success('Profile updated', 'Your changes have been saved.');
    } catch (err) {
      toastError('Could not save', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  // Profile picture: upload to Cloudinary, persist the URL, refresh /me.
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const avatarUrl = user?.avatarUrl;

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Invalid file', 'Please choose an image.');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadPhoto(file, { purpose: 'avatar' });
      await api.patch('/api/auth/me', { avatarUrl: url });
      await refetchMe();
      success('Photo updated', 'Your profile picture has been saved.');
    } catch (err) {
      toastError('Upload failed', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <h2 className="text-2xl font-medium text-[#001F00]">Hi, {user?.name}</h2>
      <p className="mt-1 text-base leading-[21px] tracking-[0.01em] text-[#1E1E1E]/50">
        If you have any edits to make, change the values and hit the save button.
      </p>

      <div className="mt-6 flex min-h-[58vh] items-center justify-center">
        <div className="flex w-full flex-col items-center gap-12 lg:flex-row lg:justify-center lg:gap-24">
        {/* Avatar + upload */}
        <div className="relative h-56 w-56 shrink-0 lg:h-72 lg:w-72">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-full bg-[#0B5000]/10 text-[#0B5000]">
              <span className="text-6xl font-semibold lg:text-7xl" style={{ fontFamily: HEADING_FONT }}>
                {initials(user?.name)}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile picture"
            className="absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-full bg-[#0B5000] text-white shadow-lg ring-4 ring-white transition-colors hover:bg-[#001F00] disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid w-full max-w-[600px] grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2"
          noValidate
        >
          <Field label="First Name*" error={errors.firstName}>
            <input
              className={underline}
              autoComplete="given-name"
              {...register('firstName', { required: 'Required' })}
            />
          </Field>
          <Field label="Last Name*" error={errors.lastName}>
            <input
              className={underline}
              autoComplete="family-name"
              {...register('lastName', { required: 'Required' })}
            />
          </Field>

          <Field label="Date Of Birth">
            <input type="date" max={today} className={underline} {...register('dob')} />
          </Field>
          <Field label="Gender">
            <select className={cn(underline, '[&>option]:text-black')} {...register('gender')}>
              <option value="">Select</option>
              {GENDERS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          {/* Email + phone are login identifiers — shown, not editable here. */}
          <Field label="Email ID*">
            <input className={underline} value={user?.email ?? ''} readOnly disabled />
          </Field>
          <Field label="Phone Number*">
            <input className={underline} value={user?.phone ?? ''} readOnly disabled />
          </Field>

          <div className="mt-4 sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full border border-[#001F00] py-4 text-base font-medium text-[#001F00] transition-colors hover:bg-[#001F00] hover:text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
