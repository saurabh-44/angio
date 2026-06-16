import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Image as ImageIcon, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import { uploadPhoto } from '@/queries/uploads.js';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';

// Field-friendly photo capture + Cloudinary upload widget.
//
// Why this is its own component: volunteers in the field need a *fast*
// "take photo → preview → upload" loop with retry, on a 3G phone. The
// upload result ({ url, publicId }) gets bubbled up via onUploaded.
//
// Props:
//   purpose    — 'plant' | 'maintenance' (drives the upload signature endpoint)
//   siteId     — required for plant uploads
//   plantId    — required for maintenance uploads
//   onUploaded — called with { url, publicId } on success
//   onCleared  — called when the user removes the photo
export default function PhotoCapture({ purpose, siteId, plantId, onUploaded, onCleared }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'done' | 'error'
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(null);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function startUpload(nextFile) {
    setStatus('uploading');
    setError(null);
    try {
      const result = await uploadPhoto(nextFile, { purpose, siteId, plantId });
      setUploaded(result);
      setStatus('done');
      onUploaded?.(result);
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    }
  }

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploaded(null);
    onCleared?.();
    startUpload(f);
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setUploaded(null);
    setStatus('idle');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onCleared?.();
  }

  function retry() {
    if (file) startUpload(file);
  }

  // No photo yet — show the big tap target.
  if (!previewUrl) {
    return (
      <div className="space-y-3">
        <label
          htmlFor="photo-capture"
          className={cn(
            'block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-secondary/40 px-6 py-12 text-center',
            'hover:bg-secondary/60 transition-colors focus-within:ring-2 focus-within:ring-ring',
          )}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Camera className="h-7 w-7" aria-hidden />
          </div>
          <div className="font-heading text-base font-semibold text-foreground">Take a photo</div>
          <div className="mt-1 text-sm text-muted-foreground">Or pick one from your gallery</div>
          <input
            ref={inputRef}
            id="photo-capture"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={pick}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card">
        <img src={previewUrl} alt="Captured" className="w-full aspect-square object-cover" />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2 shadow-soft"
          onClick={reset}
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </Button>
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 px-4 py-3 text-sm font-medium flex items-center gap-2',
            status === 'uploading' && 'bg-foreground/70 text-card',
            status === 'done' && 'bg-leaf-600 text-card',
            status === 'error' && 'bg-destructive text-destructive-foreground',
          )}
        >
          {status === 'uploading' && (
            <>
              <Spinner className="text-card" /> Uploading…
            </>
          )}
          {status === 'done' && (
            <>
              <CheckCircle2 className="h-4 w-4" /> Uploaded
            </>
          )}
          {status === 'error' && (
            <>
              <Upload className="h-4 w-4" /> {error}
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {status === 'error' && (
          <Button type="button" variant="outline" onClick={retry} className="flex-1">
            <RefreshCw className="h-4 w-4" /> Retry upload
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={reset} className="flex-1">
          <ImageIcon className="h-4 w-4" /> Replace photo
        </Button>
      </div>
    </div>
  );
}
