# Architecture Overview

## Three delivery channels, one React codebase

The same React app (`client/`) ships three ways:

1. **Native iOS/Android app** — bundled inside the Capacitor shell via `npm run build && npx cap sync`, then opened in Xcode / Android Studio.
2. **Web browser** — served as a static site from any host (e.g. Vercel, Netlify, or a CDN).
3. **API** — both of the above call the same Express server.

```
┌─────────────────────────┐    ┌─────────────────────────┐
│   iOS / Android app     │    │   Web browser           │
│   (Capacitor shell)     │    │   (hosted static site)  │
│   capacitor://localhost │    │   https://app.example   │
│   Bearer token auth     │    │   httpOnly cookie auth  │
└────────────┬────────────┘    └────────────┬────────────┘
             │                              │
             │ HTTPS to api.example.com     │
             └──────────────┬───────────────┘
                            ▼
             ┌──────────────────────────────┐
             │   Caddy 2  :443 auto-TLS     │
             │   reverse_proxy → server:4000│
             └──────────────┬───────────────┘
                            ▼
             ┌──────────────────────────────┐
             │   Node 20 + Express (Docker) │
             │   /api/*   :4000             │
             │   Zod · JWT · Mongoose       │
             └──────┬───────────────┬───────┘
                    │               │
          ┌─────────▼────┐  ┌───────▼──────────┐
          │   MongoDB 7  │  │   Cloudinary CDN  │
          │   internal   │  │   (photos, direct │
          │   not exposed│  │    from client)   │
          └──────────────┘  └───────────────────┘
```

---

## Dual-mode auth

Auth adapts to the delivery channel at runtime based on the `isNative` flag from `Capacitor.isNativePlatform()`.

| Aspect | Web browser | Native app (Capacitor) |
|--------|-------------|------------------------|
| Token storage | httpOnly cookies (server sets them) | Capacitor Preferences (Keychain on iOS, encrypted prefs on Android) — see `client/src/lib/nativeAuth.js` |
| Token transport | Cookie header (automatic) | `Authorization: Bearer <token>` header, added in `client/src/lib/api.js` |
| Signal to server | No special header | `X-Client: native` header |
| Refresh token | Cookie (same `requireAuth` flow) | Sent as Bearer / request body |
| Server reads | `req.cookies[ACCESS_COOKIE]` first, then `getBearerToken(req)` | `getBearerToken(req)` — in `server/src/middleware/auth.js` |

CORS: the server allows `CLIENT_ORIGIN` (web client), `capacitor://localhost` (iOS), `http://localhost` + `https://localhost` (Android webview), and requests with no `Origin` header (native HTTP plugin, curl). See `server/src/app.js`.

Token lifecycle (native):
- `hydrateTokens()` reads both tokens from Preferences into an in-memory cache at app startup.
- `getAccessToken()` is synchronous — `api.js` reads it without awaiting on every request.
- `setTokens()` persists a fresh pair after login or token refresh.
- `clearTokens()` wipes cache + Preferences on logout.

---

## Data / feature flows

### Photo uploads — Cloudinary signed direct upload
1. Client calls `POST /api/uploads/sign` → server returns a Cloudinary signature with pinned `folder` + `public_id`.
2. Client uploads bytes directly to `api.cloudinary.com` — Node never proxies the binary.
3. Client sends back the resulting `secure_url` in the plant/maintenance form body.

### QR codes
- Each plant has a `publicCode` (nanoid). The server encodes `${CLIENT_ORIGIN}/tree/{publicCode}` into a QR PNG.
- Bulk QR sheet: `server/src/services/plants/bulkQrService.js` generates an A4 PDF (3×5 grid) with pdfkit. `margin: 0` is required to avoid phantom extra pages — a known pdfkit quirk.
- `CLIENT_ORIGIN` must be set to the hosted web-client URL or QR scan links resolve to nothing (issue #10).

### CO₂ estimation
- `server/src/services/co2/co2Service.js` uses a linear per-year estimate per plant, weighted by species absorption rate when a `speciesRef` is present.

### Payments — Razorpay
1. Client calls `POST /api/payments/order` → server creates a Razorpay order and returns `order_id`.
2. Client opens Razorpay checkout (in-browser SDK).
3. On success, client calls `POST /api/payments/verify` → server verifies HMAC-SHA256 signature before marking the donation paid.

### Authenticated file fetch (PDFs, native)
- On web: `window.open(apiPath)` — same-origin, cookies travel.
- On native: `client/src/lib/nativeFile.js` fetches the PDF with `Authorization: Bearer`, writes it to `Directory.Cache` via `@capacitor/filesystem`, then invokes `Share.share()` → iOS share sheet (Print / Save to Files / Open In…).

---

## Native-specific details

### Capacitor plugins used

| Plugin | Usage |
|--------|-------|
| `@capacitor/camera` | Permission priming; native camera for photos |
| `@capacitor/geolocation` | Permission priming; GPS capture |
| `@capacitor/preferences` | Token persistence (Keychain / encrypted prefs) |
| `@capacitor/filesystem` | Write PDF to cache before sharing |
| `@capacitor/share` | iOS share / print sheet for PDFs |

### Permission priming
`client/src/lib/nativePermissions.js` exports:
- `primeNativePermissions()` — called once on first authed screen; requests camera + photos + location up front so OS prompts appear early.
- `ensureCameraPermission()` — point-of-use gate; on web always returns `'granted'`.
- `ensureLocationPermission()` — point-of-use gate; on web always returns `'granted'`.

### Safe-area insets
All app screens account for iOS notch / home-bar safe areas via Tailwind `safe-*` classes. Pinch-zoom is disabled in `capacitor.config.json`.

---

## Stack table

| Layer | Technology |
|-------|-----------|
| **Server** | Node 20, Express 4 (ESM), Mongoose 8, Zod, Pino, Nodemailer/Resend, pdfkit, qrcode, xlsx |
| **Client** | React 18, Vite, Tailwind 3, shadcn/ui, TanStack Query v5, React Router 6, React Hook Form, Framer Motion |
| **Mobile** | Capacitor 8 — iOS + Android; same React app bundled into native shell |
| **Infra** | Docker Compose (mongo + server + caddy), Caddy 2 auto-TLS, Cloudinary CDN, Razorpay |
