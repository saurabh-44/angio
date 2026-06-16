// Fetch wrapper for the backend.
//
// - Sends cookies (httpOnly JWT) on every request via `credentials: 'include'`.
// - Normalizes errors into a typed ApiError so callers don't parse status codes
//   or response shapes.
// - On 401 it tries ONE silent /auth/refresh and retries the original request.
//   The refresh attempt itself never re-recurses (guarded by a per-call flag).
//
// Why centralized: every page, hook, and form goes through this. Auth/refresh
// logic stays here so React Query / useAuth / forms don't each reinvent it.

// Same-origin by default ('' prefix → fetch goes to whatever origin
// the page is on, which Vite's dev proxy forwards to localhost:4000).
// Override only when the API is on a totally different domain in prod.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message ?? code ?? `Request failed (${status})`);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text };
  }
}

async function doRequest(method, path, { body, signal, headers, _retry = false } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 401 → try refreshing the session once, then retry the original request.
  // We don't retry the refresh call itself or anything in the /auth/ tree.
  if (
    res.status === 401 &&
    !_retry &&
    !path.startsWith('/api/auth/refresh') &&
    !path.startsWith('/api/auth/login') &&
    !path.startsWith('/api/auth/forgot-password') &&
    !path.startsWith('/api/auth/reset-password')
  ) {
    const refreshed = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      return doRequest(method, path, { body, signal, headers, _retry: true });
    }
  }

  const data = await parseJson(res);
  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: data?.error?.code,
      message: data?.error?.message ?? `Request failed (${res.status})`,
      details: data?.error?.details,
    });
  }
  return data;
}

export const api = {
  get: (path, opts) => doRequest('GET', path, opts),
  post: (path, body, opts) => doRequest('POST', path, { ...opts, body }),
  patch: (path, body, opts) => doRequest('PATCH', path, { ...opts, body }),
  put: (path, body, opts) => doRequest('PUT', path, { ...opts, body }),
  del: (path, opts) => doRequest('DELETE', path, opts),
};

// Direct multipart upload to Cloudinary using a signed payload from
// `POST /api/uploads/signature`. The browser uploads bytes straight to
// Cloudinary — the Node server never proxies the image.
export async function uploadToCloudinary(file, signature) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('public_id', signature.publicId);
  const res = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ApiError({
      status: res.status,
      code: 'CLOUDINARY_UPLOAD_FAILED',
      message: `Photo upload failed: ${txt.slice(0, 200)}`,
    });
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}
