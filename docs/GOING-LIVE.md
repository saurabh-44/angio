# Pre-Handoff Checklist — Going Live

Scan top-to-bottom before handing the app to the client. Every `- [ ]` is a blocker or a step that must be done once; tick it off as you go.

---

## Domain & DNS

| Record | Type | Points to | Notes |
|--------|------|-----------|-------|
| `api` | A | `<VPS_IP>` | API server |
| `environ` | A | `<VPS_IP>` | Web SPA / QR scan links |

- [ ] Both A records created and propagated (`dig api.example.com`, `dig environ.example.com`)
- [ ] Both set to **DNS-only / grey-cloud** — no proxy. Caddy needs a direct TCP connection on port 80 to complete the Let's Encrypt ACME challenge.
- [ ] `deploy/Caddyfile` updated with the real domain (replace `example.com`)
- [ ] `docker-compose.yml` `web` build arg `VITE_API_BASE_URL` updated to `https://api.example.com`

---

## Server secrets (`server/.env`)

Generate fresh values — never reuse dev values in production.

```bash
openssl rand -base64 48   # JWT secrets
openssl rand -hex 32      # webhook secret
```

- [ ] `JWT_ACCESS_SECRET` — fresh value, min 32 chars
- [ ] `JWT_REFRESH_SECRET` — fresh value, different from access secret
- [ ] `CLIENT_ORIGIN=https://environ.example.com`
- [ ] `PUBLIC_URL=https://api.example.com`
- [ ] `COOKIE_SECURE=true`
- [ ] `COOKIE_SAMESITE=none`
- [ ] `PRIMARY_NGO_ADMIN_EMAIL` — client's admin email address
- [ ] `PRIMARY_NGO_ADMIN_PASSWORD` — strong initial password (client changes on first login)
- [ ] `PRIMARY_NGO_ADMIN_NAME` — client's name / NGO name
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — live Cloudinary creds
- [ ] `CLOUDINARY_UPLOAD_FOLDER` — set to a meaningful name for this NGO if needed
- [ ] Mail configured — either `RESEND_API_KEY` (preferred) **or** `MAIL_HOST`/`MAIL_USER`/`MAIL_PASS`/`MAIL_FROM_EMAIL`
- [ ] `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — live keys (`rzp_live_…`)
- [ ] `RAZORPAY_WEBHOOK_SECRET` — value from `openssl rand -hex 32`; must match the Razorpay dashboard
- [ ] `TREE_UNIT_PRICE_INR` — confirmed with client (default `200`)

> `MONGODB_URI` is injected by docker-compose — do not set it in `.env` for Docker deploys.

---

## Razorpay go-live

- [ ] Business KYC completed in Razorpay dashboard
- [ ] Switched to **live mode** — keys start with `rzp_live_`
- [ ] `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` updated in `server/.env`
- [ ] Webhook created in Razorpay dashboard (live mode) with:
  - URL: `https://api.example.com/api/payments/webhook`
  - Events: `payment.captured`, `payment.failed`
  - Secret: same value as `RAZORPAY_WEBHOOK_SECRET` in `server/.env`
- [ ] Test a small live payment end-to-end before handoff

---

## Email

- [ ] Sending domain verified in Resend (or your SMTP provider): SPF + DKIM DNS records added
- [ ] `MAIL_FROM_EMAIL` set to an address on the verified domain
- [ ] OTP email delivery tested with the client's real email address
- [ ] Temp-password email tested (create a test user via admin panel)

---

## Mobile apps

```bash
nvm use 22                        # Capacitor CLI v8 requires Node 22
cd client
# set VITE_API_BASE_URL in client/.env.production first
npm run build && npx cap sync
npx cap open ios                  # → Xcode for IPA
npx cap open android              # → Android Studio for AAB
```

- [ ] `nvm use 22` active before building
- [ ] `client/.env.production` has `VITE_API_BASE_URL=https://api.example.com`
- [ ] iOS bundle ID and display name confirmed with client
- [ ] `ios/App/App/Info.plist` has `NSCameraUsageDescription` + `NSLocationWhenInUseUsageDescription`
- [ ] Apple Developer account active; provisioning profile + signing cert set up in Xcode
- [ ] Release IPA built and tested on a physical device (TestFlight)
- [ ] Google Play Console account active; signing keystore created and stored safely
- [ ] Release AAB built and tested (internal track)
- [ ] Both apps submitted to respective stores

---

## CI/CD

- [ ] GitHub repo secret `VPS_HOST` set to `<VPS_IP>` (or hostname)
- [ ] GitHub repo secret `VPS_USER` set to the deploy SSH username
- [ ] GitHub repo secret `VPS_SSH_KEY` set to the private key of the deploy keypair
- [ ] Deploy public key is in `~/.ssh/authorized_keys` on the VPS for that user:
  ```bash
  ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/angio_deploy -N ""
  ssh-copy-id -i ~/.ssh/angio_deploy.pub <VPS_USER>@<VPS_IP>
  # paste contents of ~/.ssh/angio_deploy into the VPS_SSH_KEY secret
  ```
- [ ] `production` environment created in GitHub → repo Settings → Environments
- [ ] Deployment branch policy set to `main` only (prevents secrets leaking to other branches)
- [ ] Pushed a commit to `main` and confirmed the Actions workflow ran green end-to-end

---

## Client-provided assets

Per the project proposal — collect these before handoff:

- [ ] Logo + brand colours / fonts (for landing page + PDF certificate header)
- [ ] Certificate template copy (text for plantation certificate + CO₂ certificate)
- [ ] Tree species data (name, scientific name, CO₂ absorption rate per year)
- [ ] Donor and project seed data (if pre-population is expected)
- [ ] NGO registration number / address (for certificate footer and Razorpay KYC)

---

## Security

- [ ] `COOKIE_SECURE=true` confirmed in `server/.env`
- [ ] All credentials shared during development rotated (JWT secrets, Cloudinary, Razorpay test keys, any passwords shared in chat)
- [ ] Open security-review findings addressed (3 unresolved as of 2026-06-23 — see issue tracker)
- [ ] Audit logging requirement confirmed with client (currently none beyond Pino request logs)
- [ ] VPS SSH access reviewed — remove any dev/temporary public keys from `~/.ssh/authorized_keys`
- [ ] `server/.env` never committed — verify with `git log --all --full-history -- server/.env`

---

## Map

- [ ] No configuration needed — map uses **Leaflet + OpenStreetMap** (key-less). `VITE_GOOGLE_MAPS_API_KEY` can be removed from any `.env` file.
