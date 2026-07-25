import { useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { formatGeo } from '@/lib/format.js';

// GPS coordinate capture for the field forms. The location is read
// straight from the device's Geolocation API — there is deliberately NO
// manual lat/lng entry. A planting's coordinates must always reflect where
// the volunteer physically stood, so they can't be typed in or faked from
// a desk. Calls onChange({ lat, lng }); either null means "not captured yet".
export default function GpsCapture({ value, onChange, disabled }) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  async function capture() {
    if (!navigator.geolocation) {
      toastError('GPS unavailable', 'Your device does not support live location.');
      return;
    }
    setBusy(true);
    // Native: ensure the OS location permission is granted before reading
    // GPS (issue #3/#5) — prompts on demand. No-op on web.
    const { ensureLocationPermission } = await import('@/lib/nativePermissions.js');
    const perm = await ensureLocationPermission();
    if (perm === 'denied') {
      setBusy(false);
      toastError(
        'Location permission needed',
        'Turn on location for Environ in Settings, then tap capture again.',
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setAccuracy(
          pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
        );
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        // Map the browser's terse GeolocationPositionError into something a
        // volunteer in the field can act on. Code 1 (PERMISSION_DENIED) is by
        // far the most common — the site's location permission is blocked, or
        // the phone isn't giving the browser location access.
        if (err.code === err.PERMISSION_DENIED) {
          toastError(
            'Location is blocked',
            "Allow location for this site — tap the icon to the left of the web address, open Permissions, set Location to Allow, then tap the button again. Also make sure your phone's location (GPS) is turned on.",
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toastError(
            'Location unavailable',
            'Your device could not get a GPS fix. Move to an open area away from buildings and try again.',
          );
        } else if (err.code === err.TIMEOUT) {
          toastError(
            'Location timed out',
            'It took too long to get a fix. Try again with a clear view of the sky.',
          );
        } else {
          toastError("Couldn't read your location", err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  const captured = value?.lat != null && value?.lng != null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={captured ? 'outline' : 'accent'}
        className="w-full"
        size="lg"
        onClick={capture}
        disabled={disabled || busy}
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
        {captured ? 'Refresh location' : 'Use my current location'}
      </Button>

      {captured ? (
        // Read-only confirmation of the coordinates the device reported.
        // Shown, not edited — the volunteer can only refresh, never type.
        <div className="flex items-start gap-2.5 rounded-[10px] border border-leaf-100 bg-leaf-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" aria-hidden />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-leaf-700">Location captured</div>
            <div className="mt-0.5 font-mono text-xs text-[#1E1E1E]/70">{formatGeo(value)}</div>
            {accuracy != null && (
              <div className="mt-0.5 text-[11px] text-[#1E1E1E]/50">
                Accurate to about {accuracy} m
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Your device's live location is required. Stand next to the planting hole, then tap the
          button above — coordinates can't be entered by hand.
        </p>
      )}
    </div>
  );
}
