import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { openAuthedFile } from '@/lib/nativeFile.js';
import { useToast } from '@/components/ui/toast.jsx';

// Small wrapper for the dozen places that hit an /api/excel/export endpoint.
// Downloads through openAuthedFile so it carries auth on every platform
// (cookie on web, Bearer in the native app) instead of a bare <a download>,
// which only works same-origin in dev.
function filenameFromHref(href) {
  return href.split('?')[0].split('/').pop() || 'export.xlsx';
}

export default function ExportButton({
  href,
  label = 'Export',
  variant = 'outline',
  size = 'sm',
  className,
}) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await openAuthedFile(href, filenameFromHref(href));
    } catch (err) {
      toastError('Export failed', err?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleClick}
      disabled={busy}
    >
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
