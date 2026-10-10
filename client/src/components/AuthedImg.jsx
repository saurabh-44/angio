import { useEffect, useState } from 'react';
import { fetchAuthedBlob } from '@/lib/nativeFile.js';

// <img> for an authenticated /api image (e.g. the tree QR PNG). A plain
// `src="/api/..."` resolves against the web app's origin, not the API
// host, and can't carry the native Bearer token — so we fetch the bytes
// with auth and hand the <img> an object URL instead.
export default function AuthedImg({ src, alt, ...rest }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    setUrl(null);
    fetchAuthedBlob(src)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {}); // leave the placeholder; Download surfaces errors
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!url) return <span aria-label={alt} role="img" {...rest} />;
  return <img src={url} alt={alt} {...rest} />;
}
