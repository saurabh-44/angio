# Environ — Server

Backend for the NGO tree-planting transparency app. Donors pay the NGO offline, the NGO allocates the donation across one or more sites and assigns volunteers, volunteers upload geotagged planting photos and weekly maintenance photos, and donors get a verifiable view of their funded trees.

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
| `ngo_admin` | Top role. Create / update / remove any user, site, donation, allocation, plant, assignment. The seeded `isPrimary` admin is additionally the only one who can create other `ngo_admin` accounts. |
| `donor` | Read-only on their own donations, allocations, plants, and weekly maintenance logs. They never see another donor's data. |
| `site_owner` | Manages their own site(s): assigns volunteers, records plantings, can update plants and add maintenance logs on their own sites. They never see another site owner's data. |
| `volunteer` | Records plantings (with GPS + photo) and weekly maintenance photos on the sites they're assigned to. Sees only their own work. |

`ngo_admin` and `site_owner` go through password → emailed OTP at login. `donor` and `volunteer` log in with password only (still with lockout) so they don't get blocked by OTP friction in the field. Password reset is OTP-based for everyone.

## Auth flow

```
POST /api/auth/login                   { email, password }
  → ngo_admin / site_owner            → { requiresOtp: true }   (OTP emailed)
  → donor / volunteer                 → { requiresOtp: false, user }   (cookies set)

POST /api/auth/login/verify            { email, otp }           (OTP roles only)
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

| Path | NGO Admin | Site Owner | Donor | Volunteer |
|------|-----------|-----------|-------|-----------|
| `GET/POST /api/users` | all | — | — | — |
| `GET/POST /api/sites` | all | own only (R) | — | — |
| `GET/POST /api/donations` | all | — | own (R) | — |
| `GET/POST /api/allocations` | all | on own sites (R) | own (R) | — |
| `POST /api/plants`, `GET /api/plants` | all | on own sites | own (R) | own plantings |
| `POST /api/maintenance`, `GET /api/maintenance` | all | on own sites | own (R) | own |
| `POST /api/assignments` | all | for own sites | — | own (R) |
| `POST /api/uploads/signature` | ✓ | ✓ | — | ✓ |

Every list endpoint supports `?page=&limit=` and a few entity-specific filters (`?role=`, `?site=`, `?donor=`, etc.).

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
├── models/       User · Site · Donation · Allocation · Plant · MaintenanceLog
│                 Assignment · OtpRequest · JwtBlacklist · plugins/softDelete
├── services/
│   ├── auth/    authService · tokens · cookies · otpService · loginLockout · seedNgoAdmin
│   ├── users/   passwordService · userService
│   ├── sites/   siteService
│   ├── donations/ donationService (donations + allocations)
│   ├── plants/  plantService (plants + maintenance)
│   └── assignments/ assignmentService
├── middleware/  auth (requireAuth, requireRole, blockIfForcedPasswordChange)
│                validate · rateLimit · errorHandler
├── controllers/ one per resource
├── routes/      auth · users · sites · donations · allocations · plants
│                maintenance · assignments · uploads · health
├── mail/templates/ loginOtp · passwordResetOtp · passwordChanged · accountCreated
├── validation/  zod schemas per resource
└── utils/       httpError · asyncHandler · logger
```

## Frontend (next)

The React frontend lives under `client/` and is built next. It will hit these endpoints with `credentials: 'include'`.
