import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// Figma auth screens (Sign Up / Sign In): a full-bleed forest photo with a
// frosted-glass form panel on the right. Shared shell so Login and Register
// stay pixel-identical — fonts, glass, back button, panel padding all live
// here; each screen just supplies its title, subtitle, and form.
export const HEADING_FONT = "'Zalando Sans Expanded', 'Plus Jakarta Sans', sans-serif";
export const BODY_FONT = "'Zalando Sans', 'Inter', sans-serif";

export function GlassAuthScreen({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ fontFamily: BODY_FONT }}>
      <img
        src="/auth-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />

      <Link
        to="/"
        aria-label="Back to home"
        className="absolute left-6 top-6 z-10 grid h-14 w-14 place-items-center rounded-full border border-[#E2E8F0] bg-white/30 backdrop-blur-[2px] transition-colors hover:bg-white/40"
      >
        {/* Exact Figma arrow (Vector.svg). */}
        <svg width="18" height="23" viewBox="0 0 18 23" fill="none" aria-hidden>
          <path
            d="M16.0263 11.0377V15.2131C16.0263 20.3893 13.087 22.5161 9.49723 19.9201L6.60792 17.8246L3.71861 15.7292C0.128871 13.1332 0.128871 8.89533 3.71861 6.29934L6.60792 4.20384L9.49723 2.10835C13.087 -0.440655 16.0263 1.67048 16.0263 6.86231V11.0377Z"
            stroke="white"
            strokeWidth="2.05263"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>

      {/* Frosted glass form panel — ~48% of the viewport (Figma: 688/1440),
          padding 100/60, content fills the panel. */}
      <div className="relative ml-auto flex min-h-screen w-full flex-col justify-center bg-white/20 px-6 py-12 backdrop-blur-[19px] sm:px-12 lg:w-[48%] lg:px-[60px] lg:py-[100px]">
        <div className="mx-auto w-full max-w-[456px] lg:mx-0 lg:max-w-none">
          <h1
            className="text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: HEADING_FONT }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-2.5 text-sm text-white/85 sm:text-base">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

// Underline input styling shared by every field. The focus cue is the
// underline going solid white, so the app's global emerald focus ring
// (index.css :focus-visible) is suppressed here.
export const inputCls =
  'auth-glass-input w-full border-b border-white/40 bg-transparent pb-2.5 text-base text-white placeholder:text-white/70 transition-colors focus:border-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [color-scheme:dark]';

// Wraps a control + its validation message.
export function FieldWrap({ error, children }) {
  return (
    <div>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-200">{error.message}</p>}
    </div>
  );
}

// Underline text input that forwards the react-hook-form ref.
export const Field = forwardRef(function Field({ error, className, ...props }, ref) {
  return (
    <FieldWrap error={error}>
      <input ref={ref} {...props} className={cn(inputCls, className)} />
    </FieldWrap>
  );
});

// Underline password input with its own show/hide toggle. The underline +
// focus ring live on the row so the eye sits on the text baseline.
export const PasswordField = forwardRef(function PasswordField({ error, ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <FieldWrap error={error}>
      <div className="flex items-center gap-2 border-b border-white/40 pb-2.5 transition-colors focus-within:border-white">
        <input
          ref={ref}
          {...props}
          type={show ? 'text' : 'password'}
          // Drop the global focus ring (we use the row underline) and hide the
          // browser's native password-reveal/clear buttons so only our eye shows.
          className="auth-glass-input min-w-0 flex-1 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="shrink-0 text-white/70 transition-colors hover:text-white"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </FieldWrap>
  );
});
