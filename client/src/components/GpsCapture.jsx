import { useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { formatGeo } from '@/lib/format.js';

// GPS coordinate picker for the volunteer planting form. Big button
// triggers the Geolocation API; numeric inputs let the user fine-tune
// or override (e.g. when GPS is unreliable indoors).
//
// Calls onChange({ lat, lng }) whenever coords change; if either is null
// the form treats it as "not captured yet".
export default function GpsCapture({ value, onChange, disabled }) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);

  async function capture() {
    if (!navigator.geolocation) {
      toastError('GPS unavailable', 'Your browser does not support geolocation.');
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
        'Enable location for Environ in Settings, then try again.',
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        toastError("Couldn't read GPS", err.message);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  const set = (k) => (e) => {
    const v = e.target.value === '' ? null : Number(e.target.value);
    onChange({ ...value, [k]: v });
  };

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
        {captured ? 'Refresh GPS' : 'Capture my location'}
      </Button>
      {captured && (
        <div className="inline-flex items-center gap-2 text-xs text-leaf-700 font-medium px-3 py-1.5 rounded-full bg-leaf-50 border border-leaf-100">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {formatGeo(value)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gps-lat" className="text-xs">Latitude</Label>
          <Input
            id="gps-lat"
            type="number"
            step="any"
            value={value?.lat ?? ''}
            onChange={set('lat')}
            placeholder="—"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gps-lng" className="text-xs">Longitude</Label>
          <Input
            id="gps-lng"
            type="number"
            step="any"
            value={value?.lng ?? ''}
            onChange={set('lng')}
            placeholder="—"
            disabled={disabled}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
        Stand next to the planting hole before tapping capture for the most accurate coordinates.
      </p>
    </div>
  );
}
