// Native (Capacitor) permission priming.
//
// On web this is a no-op. On a native build we proactively ask for
// camera + location once the user is signed in, so the OS prompts appear
// up front (issue #5) instead of failing silently the first time someone
// opens the scanner or taps "capture GPS".
//
// The Capacitor Camera / Geolocation plugins request the SAME iOS
// permissions that the in-webview `getUserMedia` (html5-qrcode) and
// `navigator.geolocation` calls rely on — so priming here grants what
// those web APIs later use. Requests are idempotent: if a permission is
// already decided, the OS does not prompt again.
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = Capacitor.isNativePlatform();

let primed = false;

// Point-of-use permission gate for the camera. Checks the current native
// status and requests it if still undecided. Returns 'granted' | 'denied'.
// On web it returns 'granted' so the browser's own getUserMedia prompt
// (html5-qrcode) drives the flow unchanged.
export async function ensureCameraPermission() {
  if (!isNativePlatform) return 'granted';
  try {
    const { Camera } = await import('@capacitor/camera');
    let status = await Camera.checkPermissions();
    if (status.camera === 'prompt' || status.camera === 'prompt-with-rationale') {
      status = await Camera.requestPermissions({ permissions: ['camera'] });
    }
    return status.camera === 'granted' || status.camera === 'limited' ? 'granted' : 'denied';
  } catch {
    return 'granted'; // plugin unavailable — let the web API try
  }
}

// Point-of-use permission gate for location. Same contract as above.
export async function ensureLocationPermission() {
  if (!isNativePlatform) return 'granted';
  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    let status = await Geolocation.checkPermissions();
    if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
      status = await Geolocation.requestPermissions();
    }
    return status.location === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'granted';
  }
}

export async function primeNativePermissions() {
  if (!Capacitor.isNativePlatform() || primed) return;
  primed = true;

  try {
    const { Camera } = await import('@capacitor/camera');
    await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  } catch {
    // Plugin missing or user dismissed — non-fatal; the feature will
    // prompt again on first use.
  }

  try {
    const { Geolocation } = await import('@capacitor/geolocation');
    await Geolocation.requestPermissions();
  } catch {
    // Non-fatal.
  }
}
