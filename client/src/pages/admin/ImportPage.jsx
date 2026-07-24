import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  HandCoins,
  Loader2,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import DownloadLink from '@/components/DownloadLink.jsx';
import { Button, buttonVariants } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { api, ApiError } from '@/lib/api.js';

// Two-column importer page: donors on the left, donations on the right.
// Each section has the same shape — template download, upload widget,
// and an inline results block after a run.
//
// Files go straight through `api.post` as FormData. The api client
// detects FormData and skips JSON encoding; multer parses on the server.
export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Bulk data"
        title="Import from Excel"
        description="Bring in existing sponsors or historical donations in one go. Each upload returns a per-row summary so you can see exactly what landed."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <ImportCard
          icon={Users}
          tone="leaf"
          title="Sponsors"
          description="Add sponsor accounts in bulk. Existing emails are skipped silently. Each new sponsor gets a temp-password email and is forced to rotate it on first login."
          templateHref="/api/excel/templates/donors.xlsx"
          uploadEndpoint="/api/excel/import/donors"
          fields={[
            'name (required)',
            'email (required, must be unique)',
            'phone (optional)',
            'is_active (optional, default true)',
          ]}
        />
        <ImportCard
          icon={HandCoins}
          tone="amber"
          title="Donations"
          description="Bring in historical donation records. Each row needs a sponsor email that already exists in the system. Donations are recorded as `paid` so the NGO admin can allocate them next."
          templateHref="/api/excel/templates/donations.xlsx"
          uploadEndpoint="/api/excel/import/donations"
          fields={[
            'donor_email (required, must already exist)',
            'amount (required, numeric)',
            'method (cash / upi / bank_transfer / cheque / online / other)',
            'paid_at (optional, YYYY-MM-DD)',
            'tree_count (optional, integer)',
            'note (optional)',
          ]}
        />
      </div>
    </>
  );
}

function ImportCard({
  icon: Icon,
  tone = 'leaf',
  title,
  description,
  templateHref,
  uploadEndpoint,
  fields,
}) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'done' | 'error'
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const { success, error: toastError } = useToast();

  const tones = {
    leaf: { chip: 'bg-leaf-100 text-leaf-700' },
    amber: { chip: 'bg-amber-100 text-amber-600' },
  };

  async function handleFile(file) {
    if (!file) return;
    setStatus('uploading');
    setError(null);
    setSummary(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const result = await api.post(uploadEndpoint, form);
      setSummary(result);
      setStatus('done');
      const ok = result?.created ?? 0;
      const skipped = result?.skipped ?? 0;
      const failed = result?.failed ?? 0;
      if (failed > 0) {
        toastError(
          `${ok} created, ${failed} failed`,
          'Scroll down for the per-row error list.',
        );
      } else {
        success(
          `${ok} ${ok === 1 ? 'row' : 'rows'} imported`,
          skipped ? `${skipped} skipped as duplicates.` : 'All rows landed.',
        );
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <section className="bento-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tones[tone].chip}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
          Expected columns
        </div>
        <ul className="text-sm text-foreground space-y-0.5">
          {fields.map((f) => (
            <li key={f} className="font-mono text-xs">
              · {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <DownloadLink
          href={templateHref}
          className={cn(buttonVariants({ variant: 'outline' }), 'flex-1')}
        >
          <Download className="h-4 w-4" /> Download template
        </DownloadLink>
        <Button
          type="button"
          className="flex-1"
          onClick={() => fileRef.current?.click()}
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Choose file
            </>
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="sr-only"
          aria-label={`Upload ${title.toLowerCase()} Excel file`}
        />
      </div>

      {status === 'error' && error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm">
            <div className="font-semibold text-foreground">Upload failed</div>
            <p className="text-muted-foreground mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {status === 'done' && summary && <ImportSummary summary={summary} />}
    </section>
  );
}

function ImportSummary({ summary }) {
  const { rows, created = 0, skipped = 0, failed = 0, errors = [] } = summary;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
        <h3 className="font-heading text-sm font-semibold">Import result</h3>
        <Badge variant="muted">{rows ?? 0} rows read</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCell
          icon={CheckCircle2}
          tone="leaf"
          label="Created"
          value={created}
        />
        <StatCell
          icon={Sparkles}
          tone="muted"
          label="Skipped"
          value={skipped}
        />
        <StatCell
          icon={AlertCircle}
          tone="destructive"
          label="Failed"
          value={failed}
        />
      </div>
      {errors.length > 0 && (
        <details className="rounded-xl border border-border/60 bg-secondary/40 p-3 group">
          <summary className="cursor-pointer text-sm font-medium text-foreground inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
            Per-row errors ({errors.length})
          </summary>
          <ul className="mt-3 space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-muted-foreground font-mono">
                <span className="text-destructive font-semibold">Row {e.row}:</span>{' '}
                {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function StatCell({ icon: Icon, tone, label, value }) {
  const tones = {
    leaf: 'text-leaf-700 bg-leaf-50 border-leaf-100',
    muted: 'text-muted-foreground bg-secondary border-border/60',
    destructive: 'text-destructive bg-destructive/5 border-destructive/20',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] ?? tones.muted}`}>
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-[10px] uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <div className="mt-1 font-heading text-2xl font-bold">{value}</div>
    </div>
  );
}
