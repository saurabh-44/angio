// Downloading authenticated file endpoints (xlsx / pdf) across web + native.
//
// A plain <a href="/api/..." download> only works in dev, where the web app
// is same-origin with the API (Vite proxy) and the auth cookie travels. It
// breaks in two places:
//   • the deployed WEBSITE — the SPA (environ.<domain>) is a different origin
//     from the API (api.<domain>), so a relative /api path 404s and the
//     cross-site cookie needs an explicit credentialed request; and
//   • the NATIVE app — the path resolves to capacitor://localhost (not the
//     API), the webview won't auto-download, and auth is a Bearer token, not
//     a cookie.
// So we always fetch the file in-app with auth, then hand it off: a blob
// download on web, or the OS share sheet (Print / Save to Files / Open in…)
// on native — issue #4.
import { isNative, getAccessToken } from './nativeAuth.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Fetch `apiPath` with whatever auth this platform uses (cookie on web,
// Bearer on native) and save it as `filename`.
export async function openAuthedFile(apiPath, filename) {
  const token = getAccessToken(); // null on web — cookie carries auth there
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    credentials: 'include',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(isNative ? { 'x-client': 'native' } : {}),
    },
  });
  if (!res.ok) {
    // Surface the server's reason (e.g. "No plants on this site to print")
    // instead of a bare status code.
    let message = `Couldn't download the file (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON body — keep the generic message
    }
    throw new Error(message);
  }

  const blob = await res.blob();

  if (!isNative) {
    // Browser: stream the blob to a temporary anchor to trigger a download.
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const base64 = await blobToBase64(blob);
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({ title: filename, url: uri });
}

// Back-compat alias — the QR-sheet call sites still import this name.
export const openAuthedPdf = openAuthedFile;
