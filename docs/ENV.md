# Environment Variable Reference

## Server (`server/.env`)

Source of truth: `server/src/config/env.js` (Zod-validated at startup — missing required vars crash the process with a clear error).

> In Docker production, `MONGODB_URI` is injected by `docker-compose.yml` and **overrides** any value set in `.env`. Do not set it in the file for Docker deploys.

| Variable | Required? | Default | What breaks without it |
|----------|-----------|---------|----------------------|
| `NODE_ENV` | No | `development` | — |
| `PORT` | No | `4000` | — |
| `MONGODB_URI` | **Yes** (dev/standalone) | — | Server exits at startup. In Docker, injected automatically as `mongodb://mongo:27017/angio`. |
| `JWT_ACCESS_SECRET` | **Yes** | — | Server exits at startup. Min 32 chars. Generate: `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | **Yes** | — | Server exits at startup. Min 32 chars. Must differ from access secret. |
| `JWT_ACCESS_TTL_MIN` | No | `15` | — (access tokens last 15 min by default) |
| `JWT_REFRESH_TTL_DAYS` | No | `2` | — (refresh tokens last 2 days by default) |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | CORS blocks the web client; QR codes encode the wrong URL. **In prod:** set to `https://environ.example.com` (the web SPA subdomain). Must be exact origin — no trailing slash. |
| `PUBLIC_URL` | No | `http://localhost:4000` | Certificate PDF links point to wrong host. Set to `https://api.example.com` in prod. |
| `COOKIE_DOMAIN` | No | unset | Cross-subdomain cookies won't work if `api` and `environ` are on the same root domain. |
| `COOKIE_SECURE` | No | `false` | Cookies not marked `Secure`. **Must be `true` in HTTPS prod** — required for `COOKIE_SAMESITE=none`. |
| `COOKIE_SAMESITE` | No | `lax` | **Must be `none` in prod** — web client (`environ.example.com`) calls the API (`api.example.com`) cross-subdomain; `lax`/`strict` blocks the cookies. |
| `PRIMARY_NGO_ADMIN_EMAIL` | No | — | No seed admin is created on first boot; app has no admin account. |
| `PRIMARY_NGO_ADMIN_PASSWORD` | No | — | Seed admin created without a password (login broken). |
| `PRIMARY_NGO_ADMIN_NAME` | No | `NGO Admin` | Seed admin created with default display name. |
| `RESEND_API_KEY` | No (one mail provider needed) | — | OTP emails, temp passwords, and password-reset emails fall back to console log. Acceptable in dev; broken in prod. |
| `MAIL_HOST` | No (alt. to Resend) | — | Same as above. |
| `MAIL_PORT` | No | `587` | — |
| `MAIL_USER` | No | — | SMTP auth fails without it. |
| `MAIL_PASS` | No | — | SMTP auth fails without it. |
| `MAIL_FROM_NAME` | No | `Environ` | Sender display name in emails. |
| `MAIL_FROM_EMAIL` | No | — | Some SMTP providers require a valid From address. Must be on a verified domain in prod. |
| `CLOUDINARY_CLOUD_NAME` | No | — | Plant + maintenance photo uploads fail (signing endpoint returns 500). |
| `CLOUDINARY_API_KEY` | No | — | Same as above. |
| `CLOUDINARY_API_SECRET` | No | — | Same as above. |
| `CLOUDINARY_UPLOAD_FOLDER` | No | `angio` | Photos uploaded to the root folder instead. |
| `RAZORPAY_KEY_ID` | No | — | Online sponsorship payment flow broken (order creation fails). Offline NGO-admin donation recording still works. |
| `RAZORPAY_KEY_SECRET` | No | — | Payment signature verification fails; all payments rejected. |
| `RAZORPAY_WEBHOOK_SECRET` | No | — | Razorpay server-to-server webhook (`POST /api/payments/webhook`) will reject all incoming events — HMAC verification fails. Generate: `openssl rand -hex 32`. Set the **same value** in the Razorpay dashboard webhook config AND in `server/.env`. |
| `TREE_UNIT_PRICE_INR` | No | `200` | — |

---

## Client (`client/.env.production`)

Used by Vite at build time. Values are baked into the static bundle — rotate secrets and rebuild if they change.

In Docker, `VITE_API_BASE_URL` is injected via the `web` service's build `ARG` in `docker-compose.yml`, so a separate `.env.production` file is not needed in the image. For local native builds, create `client/.env.production` manually.

| Variable | Required? | What breaks without it |
|----------|-----------|----------------------|
| `VITE_API_BASE_URL` | **Yes** (native build + Docker web build) | Native app webview has no Vite dev proxy; all API calls fail. Set to `https://api.example.com`. In local dev the Vite proxy handles it — leave unset. |
| `VITE_GOOGLE_MAPS_API_KEY` | **No longer used** | Map views now use **Leaflet + OpenStreetMap** — no API key required. This variable can be removed from `.env.production`. It is safe to leave it; it just goes unused. |

---

## CI/CD secrets (GitHub repository secrets)

Set in GitHub → repo Settings → Secrets and variables → Actions. Scoped to the `production` environment (see deployment branch policy in `docs/DEPLOYMENT.md`).

| Secret | Value |
|--------|-------|
| `VPS_HOST` | IP or hostname of the VPS |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private key of the deploy keypair (PEM, no passphrase). Generate: `ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/angio_deploy -N ""`; add the public key to `~/.ssh/authorized_keys` on the VPS; paste the private key here. |

These are never in code — they exist only as GitHub-managed secrets.

---

## Notes

- **Never commit `server/.env`** — it is gitignored. The example template is at `server/.env.production.example`.
- **Resend vs SMTP:** set `RESEND_API_KEY` **or** the `MAIL_*` block, not both. Resend takes precedence when its key is present.
- **Dev console fallback:** emails to `*.test`, `*.example`, `*.invalid`, `*.local`, `*.localhost` addresses are never sent over SMTP — the server logs the OTP / temp password to stdout instead. Useful for local dev with seeded test users.
- **Docker injected vars:** `docker-compose.yml` also injects `NODE_ENV=production` and `PORT=4000` — no need to duplicate these in `.env`.
- **Capacitor (native) builds require Node 22.** Run `nvm use 22` before `npm run build && npx cap sync` for iOS and Android. The server runs Node 20 in Docker and is unaffected.
- **Cross-subdomain cookie triplet:** `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, and `CLIENT_ORIGIN=https://environ.example.com` must all be set together in prod. Missing any one of them breaks browser auth.
