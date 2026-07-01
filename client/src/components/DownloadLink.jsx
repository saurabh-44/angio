import { useState } from 'react';
import { openAuthedFile } from '@/lib/nativeFile.js';
import { useToast } from '@/components/ui/toast.jsx';
import { cn } from '@/lib/utils';

// Drop-in replacement for a styled `<a href="/api/..." download>` that
// actually works off the website too. A bare anchor only downloads when the
// SPA is same-origin with the API and the auth cookie travels (dev only);
// this routes through openAuthedFile so the request carries auth on the
// deployed site (cross-origin cookie) and in the native app (Bearer + share
// sheet). Renders a <button> so the same Tailwind classes style it.
export default function DownloadLink({ href, filename, className, children, disabled, ...rest }) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const name = filename || href.split('?')[0].split('/').pop() || 'download';

  async function handleClick() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      await openAuthedFile(href, name);
    } catch (err) {
      toastError('Download failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className={cn(className)}
      {...rest}
    >
      {children}
    </button>
  );
}
