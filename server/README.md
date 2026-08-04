# Environ — Server

Backend for the NGO tree-planting transparency app. Sponsors order trees (offline via the admin, or online via Razorpay); the NGO admin assigns each order to a site; volunteers and the site incharge record geo-tagged, photographed plantings as **unassigned** trees; the incharge assigns existing unassigned trees to orders; and sponsors get a verifiable view of the trees fulfilling their order — map, photos, weekly maintenance, and CO₂ (in tonnes).

## Stack

Node 20+ · Express 4 · MongoDB (Mongoose 8) · JWT (httpOnly cookies) · Zod · Cloudinary (signed direct-from-browser uploads) · Resend or Nodemailer for transactional email · Pino for logs.

## Quick start

```bash
cd server
cp .env.example .env
# edit .env — set MONGODB_URI, JWT secrets (32+ chars each), the
# PRIMARY_NGO_ADMIN_EMAIL/PASSWORD/NAME, and (optionally) Cloudinary keys
npm install
npm run dev
```

On first boot the primary NGO admin is seeded from `PRIMARY_NGO_ADMIN_*`. The seeded account is created with `forcePasswordChange=true` — sign in with that email + password, then immediately call `POST /api/auth/change-password` to set a real one.

### Without external services

If `RESEND_API_KEY` and `MAIL_HOST` are both empty, every email (OTP, temp passwords, password-changed notice) prints to the server console instead of being delivered. Cloudinary is only required when you actually start uploading photos.

## Roles

| Role | What they can do |
|------|------------------|
| `ngo_admin` | Top role. Create / update / remove any user, site, donation, allocation, plant, assignment, species. Records donations (with a site → auto-allocated, or unassigned). Assigns unassigned orders to sites; filters donations by assigned/unassigned. Moves unassigned trees between sites. The seeded `isPrimary` admin is additionally the only one who can create other `ngo_admin` accounts. |
| `sponsor` (the donor role) | Orders a number of trees (no site — the admin assigns it). Read-only after that on the trees fulfilling their order + weekly maintenance + CO₂. Never sees another sponsor's data. |
| `site_owner` (site incharge) | Manages their own site(s): assigns volunteers, records **unassigned** plantings + watering, updates plants. **Sees order requests on their sites and assigns unassigned trees to fulfil them** (pending → completed). Never sees another owner's data. |
| `volunteer` | Records **unassigned** plantings (device GPS + photo) and weekly maintenance on assigned sites. **Cannot** assign trees to orders. Sees only their own work. |

**Every role** logs in with password → emailed 6-digit OTP (`OTP_LOGIN_ROLES` covers all four). Password reset is OTP-based for everyone. Login lockout (5 wrong passwords → 15 min) applies to all.

## Auth flow

```
POST /api/auth/login                   { email, password }
  → all roles                         → { requiresOtp: true }   (6-digit OTP emailed)

POST /api/auth/login/verify            { email, otp }
  → { user }   (cookies set)

POST /api/auth/forgot-password         { email }                → { ok: true }   (OTP emailed if user exists)
POST /api/auth/reset-password          { email, otp, newPassword }
  → { user }   (cookies set, every other session of that user is invalidated)

POST /api/auth/change-password         { currentPassword, newPassword }   (cookies required)
  → { ok: true }   (other sessions invalidated, current session re-cookied)

POST /api/auth/refresh                 (rotates refresh + access)
POST /api/auth/logout
GET  /api/auth/me
```

Sessions use httpOnly cookies (`angio_access`, `angio_refresh`). The frontend never touches the JWT directly — make sure your fetch calls use `credentials: 'include'`.

## Endpoint overview

| Path | NGO Admin | Site Owner | Sponsor | Volunteer |
|------|-----------|-----------|---------|-----------|
| `GET/POST /api/users` | all | volunteers (own pool) | — | — |
| `GET/POST /api/sites` | all | own only (R) | — | — |
| `GET/POST /api/donations` (`?assignment=assigned\|unassigned`) | all | — | own (R) | — |
| `GET/POST /api/allocations` (returns `planted`/`remaining`/`fulfilled`) | all | on own sites (R) | own (R) | — |
| `GET /api/allocations/:id/attachable-plants`, `POST …/attach-plants` | ✓ | own sites | — | **—** |
| `POST /api/plants` (allocation optional → unassigned), `GET /api/plants` | all | on own sites | own (R) | own plantings |
| `POST /api/plants/move-site` (unassigned trees only) | ✓ | — | — | — |
| `PATCH /api/plants/:id` (incl. `speciesRef`) | all | own sites | — | own |
| `POST /api/maintenance` (geo optional server-side; the field app sends it), `GET /api/maintenance` | all | on own sites | own (R) | own |
| `GET/POST /api/species` (per-species CO₂ rate) | all (W) | R | — | R |
| `GET /api/co2/*` · `GET /api/certificates/*` (tonnes) | ✓ | — | own | — |
| `POST /api/assignments` | all | for own sites | — | own (R) |
| `POST /api/uploads/signature` | ✓ | ✓ | — | ✓ |

Every list endpoint supports `?page=&limit=` and a few entity-specific filters (`?role=`, `?site=`, `?donor=`, `?status=`, `?assignment=`, etc.).

## Photo upload flow

The Node server never proxies images. Volunteers upload from their phones in the field; the backend just signs the request.

```
1. POST /api/uploads/signature
     body: { purpose: 'plant', siteId }     OR
            { purpose: 'maintenance', plantId }
     → { cloudName, apiKey, folder, publicId, timestamp, signature, uploadUrl }

2. Client POST multipart/form-data to `uploadUrl` with:
     file, api_key, timestamp, signature, folder, public_id
   (folder + public_id MUST match the signed values or Cloudinary rejects it)

3. Cloudinary returns { secure_url, public_id }.

4. Client POST /api/plants (or /api/maintenance) with
     { ..., plantingPhoto: { url: secure_url, publicId: public_id }, geo: { lat, lng } }
```

## Smoke test

```bash
# After npm install and .env setup:
npm run dev
# In another terminal:
curl http://localhost:4000/api/health
# → {"ok":true,"ts":"..."}

# Sign the seeded primary admin in (single-step because seed runs as ngo_admin
# → triggers OTP. Watch the server console for the 6-digit code.)
curl -i -c /tmp/cookies.txt -H 'content-type: application/json' \
  -d '{"email":"admin@yourngo.org","password":"change-me-on-first-login"}' \
  http://localhost:4000/api/auth/login
# → {"requiresOtp": true}, OTP printed in server logs (console fallback)

curl -i -c /tmp/cookies.txt -H 'content-type: application/json' \
  -d '{"email":"admin@yourngo.org","otp":"123456"}' \
  http://localhost:4000/api/auth/login/verify

# Forced password change:
curl -b /tmp/cookies.txt -c /tmp/cookies.txt -H 'content-type: application/json' \
  -d '{"currentPassword":"change-me-on-first-login","newPassword":"a-real-password"}' \
  http://localhost:4000/api/auth/change-password
```

## Project layout

```
src/
├── app.js · server.js
├── config/       env · db · cloudinary · mail
├── data/         historicalPlants.json (committed one-time seed data)
├── models/       User · Site · Donation · Allocation · Plant · MaintenanceLog
│                 Assignment · Species · Project · OtpRequest · PendingSignup
│                 JwtBlacklist · plugins/{softDelete, jsonTransform}
├── services/
│   ├── auth/    authService · tokens · cookies · otpService · loginLockout · seedNgoAdmin · seedDevUsers
│   ├── users/   passwordService · userService
│   ├── sites/   siteService
│   ├── donations/ donationService (donations + allocations, incl. assignment filter + order progress)
│   ├── plants/  plantService (plants + maintenance + attach-to-order + move-site)
│   │            seedHistoricalPlants · backfillCodes · qrService · bulkQrService
│   ├── co2/     co2Service (tonnes; measured value for historical trees)
│   ├── species/ speciesService      ├── projects/ projectService
│   ├── certificates/ · analytics/ · excel/ · payments/ (Razorpay)  — each its own folder
│   └── assignments/ assignmentService
├── middleware/  auth (requireAuth, requireRole, blockIfForcedPasswordChange)
│                validate · rateLimit · errorHandler
├── controllers/ one per resource
├── routes/      auth · users · sites · donations · allocations · plants · maintenance
│                assignments · species · co2 · certificates · analytics · excel
│                payments · projects · uploads · publicTrees · health
├── mail/templates/ loginOtp · passwordResetOtp · passwordChanged · accountCreated
├── validation/  zod schemas per resource
└── utils/       httpError · asyncHandler · logger
```

## One-time historical seed

`services/plants/seedHistoricalPlants.js` seeds the NGO's pre-app trees from `src/data/historicalPlants.json` on boot — idempotent (global by `historical.sourceRowId`), non-fatal, and it auto-creates a holding site (no pre-existing site needed). The call in `server.js` is **commented out** once production is seeded. Regenerate the JSON from a new spreadsheet with `node scripts/generateHistoricalJson.js`.

## Frontend

The React frontend lives under `client/` (built and deployed). It hits these endpoints with `credentials: 'include'` on web, or `Authorization: Bearer` on the Capacitor native build.
