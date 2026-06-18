import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CameraOff,
  CheckCircle2,
  Info,
  Keyboard,
  Leaf,
  Loader2,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';

// Element id the html5-qrcode lib mounts to. Stable string so React's
// strict-mode double-mount doesn't conflict — we tear down on each
// effect cycle.
const SCANNER_ID = 'ngo-trees-qr-scanner';

// Accepted QR payloads:
//   - Full URL: https://example.com/tree/abc123_def-G   ← what our PDF prints
//   - Bare 12-char code: abc123_def-G
// Anything else is rejected with a friendly message so a stranger's
// QR (Wi-Fi config, business card, etc.) doesn't crash us.
const CODE_RX = /^[A-Za-z0-9_-]+$/;

function extractCode(text) {
  if (!text) return null;
  const trimmed = text.trim();
  // URL path /tree/<code>
  const match = trimmed.match(/\/tree\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  // Bare code
  if (CODE_RX.test(trimmed) && trimmed.length >= 6 && trimmed.length <= 64) {
    return trimmed;
  }
  return null;
}

export default function Scan() {
  const navigate = useNavigate();
  // 'idle' | 'starting' | 'scanning' | 'denied' | 'unavailable' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedRaw, setScannedRaw] = useState(null);
  const scannerRef = useRef(null);
  // Guards against double-resolve (Strict Mode + library re-calling onSuccess
  // before stop() takes effect).
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let instance = null;

    async function start() {
      setStatus('starting');
      handledRef.current = false;
      try {
        // Dynamic import keeps the (~80 KB) lib out of the initial bundle.
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        instance = new Html5Qrcode(SCANNER_ID, /* verbose */ false);
        scannerRef.current = instance;

        await instance.start(
          { facingMode: { ideal: 'environment' } },
          {
            fps: 10,
            // Square scanning box centred in the viewport.
            qrbox: (vw, vh) => {
              const min = Math.min(vw, vh);
              const size = Math.floor(min * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            handleResult(decodedText);
          },
          () => {
            // per-frame scan failure — ignore, very noisy.
          },
        );
        if (cancelled) {
          instance.stop().catch(() => undefined);
          return;
        }
        setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        // Camera permission denied or no camera at all.
        const name = err?.name ?? '';
        const msg = err?.message ?? String(err);
        if (name === 'NotAllowedError' || /denied/i.test(msg)) {
          setStatus('denied');
        } else if (name === 'NotFoundError' || /no camera/i.test(msg)) {
          setStatus('unavailable');
        } else {
          setStatus('error');
          setErrorMessage(msg);
        }
      }
    }
    start();

    return () => {
      cancelled = true;
      const i = scannerRef.current;
      scannerRef.current = null;
      if (i) {
        Promise.resolve(i.isScanning ? i.stop() : null)
          .then(() => i.clear?.())
          .catch(() => undefined);
      }
    };
  }, []);

  function handleResult(decodedText) {
    setScannedRaw(decodedText);
    const code = extractCode(decodedText);
    if (!code) {
      setStatus('error');
      setErrorMessage(
        `Not an Environ QR. Scanned: "${decodedText.slice(0, 80)}${decodedText.length > 80 ? '…' : ''}"`,
      );
      // Re-arm so the user can try again without leaving the page.
      handledRef.current = false;
      return;
    }
    setStatus('success');
    // Stop the camera before navigating so the resource is released.
    Promise.resolve(scannerRef.current?.stop?.())
      .catch(() => undefined)
      .finally(() => navigate(`/tree/${code}`));
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const code = extractCode(manualCode);
    if (!code) {
      setErrorMessage('That doesn’t look like a tree code.');
      return;
    }
    navigate(`/tree/${code}`);
  }

  function handleRetry() {
    setStatus('idle');
    setErrorMessage(null);
    handledRef.current = false;
    // Re-trigger the effect by remounting the scanner ID — easiest
    // is a full page reload, but useEffect doesn't auto-retry. Bump a
    // state to force re-run.
    setScannedRaw(null);
    // Force re-mount by toggling status briefly — useEffect uses [] deps
    // so manual retry calls reload to keep this simple.
    window.location.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Field tools"
        title="Scan a tree QR"
        description="Point your camera at the sticker on the tree. Camera permission is required."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        <div className="lg:col-span-8 space-y-4">
          <CameraPanel
            status={status}
            errorMessage={errorMessage}
            onRetry={handleRetry}
            scannedRaw={scannedRaw}
          />

          {status === 'denied' && (
            <Alert
              tone="warn"
              title="Camera permission needed"
              body="Tap the camera icon in your browser's address bar and allow access for this site, then refresh the page."
            />
          )}
          {status === 'unavailable' && (
            <Alert
              tone="warn"
              title="No camera detected"
              body="Use the manual code box on the right, or open this page on a phone."
            />
          )}
          {status === 'error' && errorMessage && (
            <Alert tone="error" title="Couldn’t read that code" body={errorMessage} />
          )}
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <ManualEntryCard
            value={manualCode}
            onChange={setManualCode}
            onSubmit={handleManualSubmit}
          />
          <TipsCard />
        </aside>
      </div>
    </>
  );
}

function CameraPanel({ status, errorMessage, onRetry, scannedRaw }) {
  return (
    <div className="bento-card overflow-hidden">
      <div className="relative aspect-square sm:aspect-video bg-foreground">
        {/* The library mounts a <video> tag inside this element. */}
        <div id={SCANNER_ID} className="absolute inset-0" />

        {/* Status overlay while we wait for the camera */}
        {status === 'starting' && (
          <div className="absolute inset-0 grid place-items-center bg-foreground text-card">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 mx-auto animate-spin" aria-hidden />
              <div className="text-sm">Starting camera…</div>
            </div>
          </div>
        )}
        {(status === 'denied' || status === 'unavailable' || (status === 'error' && !scannedRaw)) && (
          <div className="absolute inset-0 grid place-items-center bg-foreground text-card p-6">
            <div className="text-center space-y-3 max-w-sm">
              <CameraOff className="h-8 w-8 mx-auto text-card/80" aria-hidden />
              <div className="font-heading text-base font-semibold">Camera unavailable</div>
              <p className="text-sm text-card/70">
                Use the manual entry on the right instead, or refresh after granting permission.
              </p>
              <Button variant="accent" size="sm" onClick={onRetry}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          </div>
        )}
        {status === 'success' && (
          <div className="absolute inset-0 grid place-items-center bg-leaf-700/90 text-card">
            <div className="text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 mx-auto" aria-hidden />
              <div className="font-heading text-base font-semibold">Got it</div>
              <div className="text-sm text-card/80">Opening the tree record…</div>
            </div>
          </div>
        )}

        {/* Frame overlay — pure decoration, html5-qrcode draws its own
            internal box too, but ours matches our brand. */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <ScanFrame />
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-primary" aria-hidden />
          {status === 'scanning' && 'Aim at the sticker — it’ll auto-detect.'}
          {status === 'starting' && 'Waiting for camera permission…'}
          {status === 'success' && 'Redirecting…'}
          {status === 'denied' && 'Camera blocked.'}
          {status === 'unavailable' && 'No camera on this device.'}
          {status === 'error' && (errorMessage ?? 'Something went wrong.')}
        </div>
        {status === 'scanning' && (
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-600 animate-pulse" aria-hidden />
            Live
          </Badge>
        )}
      </div>
    </div>
  );
}

function ScanFrame() {
  // Four small corner brackets that resize with the parent. SVG so the
  // strokes stay crisp at any zoom.
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="w-[70%] h-[70%]"
      aria-hidden
    >
      {[
        'M 5 18 L 5 5 L 18 5',
        'M 95 18 L 95 5 L 82 5',
        'M 5 82 L 5 95 L 18 95',
        'M 95 82 L 95 95 L 82 95',
      ].map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' }}
        />
      ))}
    </svg>
  );
}

function ManualEntryCard({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="bento-card p-5 space-y-3">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <Keyboard className="h-4 w-4 text-primary" aria-hidden />
        Or type the code
      </div>
      <p className="text-xs text-muted-foreground">
        The 12-character code is printed beneath the QR on every sticker.
      </p>
      <div className="space-y-2">
        <Label htmlFor="manualCode" className="sr-only">Tree code</Label>
        <Input
          id="manualCode"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. aB12_xy3D-G"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
        />
        <Button type="submit" className="w-full">
          <Leaf className="h-4 w-4" /> Look up tree
        </Button>
      </div>
    </form>
  );
}

function TipsCard() {
  return (
    <div className="bento-card p-5 space-y-2">
      <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <Info className="h-4 w-4 text-primary" aria-hidden />
        Scanning tips
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
        <li>• Hold the phone 10–20 cm from the sticker.</li>
        <li>• Make sure the sticker is in shade if the sun is direct.</li>
        <li>• If the sticker is damaged, use the code typed below the QR.</li>
      </ul>
    </div>
  );
}

function Alert({ tone = 'info', title, body }) {
  const tones = {
    info: 'border-secondary bg-secondary text-foreground',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-destructive/30 bg-destructive/5 text-foreground',
  };
  const Icon = tone === 'error' ? AlertCircle : Info;
  return (
    <div className={`bento-card p-4 sm:p-5 flex items-start gap-3 ${tones[tone]}`}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <div>
        <div className="font-heading text-sm font-semibold">{title}</div>
        <p className="text-sm mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
