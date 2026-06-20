// Opening authenticated file endpoints (PDFs) across web + native.
//
// On WEB a new tab works — the /api path is same-origin and cookies
// travel. On NATIVE the relative path would resolve to capacitor://
// localhost (not the API), WKWebView can't display a PDF URL, and the
// endpoint needs the Bearer token anyway. So on native we fetch the file
// in-app (with auth), write it to the cache, and present the iOS share
// sheet — which includes Print, Save to Files, and Open in… (issue #4).
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

export async function openAuthedPdf(apiPath, filename) {
  if (!isNative) {
    window.open(apiPath, '_blank', 'noopener,noreferrer');
    return;
  }

  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}${apiPath}`, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-client': 'native',
    },
  });
  if (!res.ok) {
    // Surface the server's reason (e.g. "No plants on this site to
    // print") instead of a bare status code.
    let message = `Couldn't load the PDF (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // non-JSON body — keep the generic message
    }
    throw new Error(message);
  }

  const base64 = await blobToBase64(await res.blob());

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({ title: filename, url: uri });
}
