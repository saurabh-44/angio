# Environ — Session Handoff

> Read this top-to-bottom in a fresh Claude session before touching code. The repo's README is the product story; this file is the build-state, conventions, and gotchas log.

**Last updated:** 2026-06-22
**Branch:** feat/mobile-capacitor-deploy
**Status:** Dev-complete; native mobile build + Docker deploy added. Web client hosting pending (issue #10).

**Docs:** [DEPLOYMENT.md](docs/DEPLOYMENT.md) · [ARCHITECTURE.md](docs/ARCHITECTURE.md) · [ENV.md](docs/ENV.md)

---

## 1. What this is

A MERN web app for a small NGO that plants trees on behalf of donors. Four roles, one codebase. Donors verify their money funded real trees they can see (geo + photo + weekly maintenance).

**Glossary the user uses:**
- "angio" = NGO
- "roap" = plant / tree
- "primary admin" = the seed NGO admin (cannot be deleted)

**Scale target:** <100 active users, single NGO (no multi-tenancy).

**Roles:** `ngo_admin`, `site_owner`, `donor`, `volunteer`.

---

## 2. Stack snapshot

**Server** (`server/`)
- Node 20 + Express 4 (ESM)
- MongoDB + Mongoose 8 (per-schema plugins, not global)
- JWT access + refresh — **dual-mode auth**: httpOnly cookies on web, `Authorization: Bearer` tokens on native (stored in Capacitor Preferences). Server reads cookie OR Bearer via `getBearerToken()` in `middleware/auth.js`.
- `tokenVersion` for invalidation + JTI blacklist for revocation
- Zod for input validation, `asyncHandler` + `HttpError` for error flow
- Cloudinary signed direct-from-browser uploads
- Nodemailer SMTP (Gmail) with console-fallback for `.test`/`.example`/`.invalid`/`.local`/`.localhost` TLDs
- Razorpay test mode (order create + HMAC-SHA256 signature verify)
- `qrcode` + `pdfkit` for QR PNGs and PDFs (certificates + bulk QR sheets)
- `xlsx` (SheetJS) + `multer` (in-memory, 2 MB cap) for Excel import/export
- `pino` + `pino-http` for logging

**Client** (`client/`)
- Vite + React 18 (JSX, no TS)
- Tailwind 3 + shadcn/ui (Radix primitives under the hood)
- TanStack Query v5 for server state
- React Hook Form for forms
- React Router 6 with lazy-loaded routes
- `@react-google-maps/api` for map views (donor map, admin map)
- `html5-qrcode` (lazy) for in-app QR scanning
- `recharts` for admin analytics
- `framer-motion` for landing page animations

**Mobile** (`client/` + Capacitor)
- Capacitor 8 — same React app bundled into iOS / Android native shell
- `appId: org.environ.app`, `appName: Environ`, `webDir: dist`
- Native plugins: camera, geolocation, preferences, filesystem, share
- Native lib modules: `client/src/lib/nativeAuth.js`, `nativePermissions.js`, `nativeFile.js`

**Deploy**
- Docker Compose: `mongo` (MongoDB 7, named volume, internal-only) + `server` (Node 20 Alpine) + `caddy` (Caddy 2, auto-TLS)
- One-command update: `./deploy.sh`
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Dev orchestration:** root `package.json` runs `concurrently` to start server + client. Vite proxies `/api/*` → `http://localhost:4000`, so the browser sees same-origin and cookies travel cleanly.

---

## 3. Folder structure

```
Angio/
├── server/
│   └── src/
│       ├── app.js                 ← express app factory; mounts all routers
│       ├── server.js              ← entrypoint (boots app + db)
│       ├── config/env.js          ← Zod-validated process.env
│       ├── models/                ← Mongoose models (each calls jsonTransformPlugin + softDeletePlugin)
│       │   └── plugins/
│       ├── controllers/           ← thin: parse body w/ Zod schema, call service
│       ├── services/              ← business logic (per-resource folders)
│       ├── routes/                ← express routers, mount middleware + controller
│       ├── middleware/            ← requireAuth, requireNgoAdmin, blockIfForcedPasswordChange, rateLimit, errorHandler
│       ├── validation/            ← Zod schemas (per-resource files)
│       ├── mail/                  ← templates + transport
│       └── utils/                 ← logger, httpError, asyncHandler
├── client/
│   └── src/
│       ├── app/                   ← router.jsx, navConfig.js
│       ├── components/            ← AppLayout, Sidebar, TopBar, UserMenu, PageHeader, AuthShell, ConfirmDialog, EmptyState, ExportButton, GpsCapture, HealthBadge, MapView, OtpInput, Pagination, PhotoCapture, PlantCard, PlantDetailSheet, PlantStatusBadge, RoleBadge, StatTile
│       │   ├── charts/            ← ChartCard, chartTheme, DonationsBar, HorizontalRanking, MaintenanceWeeks, PlantedTrend, StatusDonut
│       │   └── ui/                ← shadcn primitives (avatar, badge, button, card, dialog, dropdown-menu, input, label, select, separator, sheet, skeleton, spinner, table, toast)
│       ├── pages/
│       │   ├── auth/              ← Login, OtpVerify, ForgotPassword, ResetPassword, ChangePassword
│       │   ├── admin/             ← AdminHome, UsersPage, SitesPage, DonationsPage, PlantsPage, MaintenancePage, AssignmentsPage, ImportPage, SpeciesPage, ProjectsPage
│       │   ├── site/              ← SiteHome (other site routes reuse admin pages)
│       │   ├── donor/             ← DonorHome, DonorTrees, DonorMap, DonorMaintenance, DonorDonations, SponsorTree
│       │   ├── volunteer/         ← VolunteerHome, VolunteerAssignments, RecordPlanting, RecordMaintenance
│       │   ├── Landing.jsx
│       │   ├── PublicTree.jsx     ← no-auth QR scan destination
│       │   └── Scan.jsx           ← in-app camera scanner
│       ├── queries/               ← TanStack Query hooks (one file per resource)
│       └── lib/                   ← api.js (fetch wrapper + ApiError), auth.jsx (context), format.js, utils.js, queryClient.js, razorpay.js, passwordStrength.js
└── README.md
```

---

## 4. Modules built (with key file refs)

All marked complete unless noted. **Status: ready for manual QA.**

| Module | Server | Client |
|---|---|---|
| **Auth + 2-step OTP** | `routes/auth.js`, `services/auth/`, `OtpRequest` model | `pages/auth/*` |
| **Users** (admin CRUD, primary admin, force-password-change) | `routes/users.js`, `services/users/userService.js` | `pages/admin/UsersPage.jsx` |
| **Sites** (NGO admin CRUD, site_owner read-only scope) | `routes/sites.js`, `services/sites/siteService.js` | `pages/admin/SitesPage.jsx` (reused by site_owner) |
| **Donations + Allocations** | `routes/donations.js`, `routes/allocations.js`, `services/donations/donationService.js` | `pages/admin/DonationsPage.jsx` |
| **Plants** (publicCode QR id, geo, photo) | `routes/plants.js`, `models/Plant.js`, `services/plants/plantService.js` | `pages/admin/PlantsPage.jsx`, `pages/volunteer/RecordPlanting.jsx` |
| **Maintenance logs** (weekly, with height/DBH/health monitoring extensions) | `routes/maintenance.js`, `models/MaintenanceLog.js` | `pages/admin/MaintenancePage.jsx`, `pages/volunteer/RecordMaintenance.jsx` |
| **Assignments** (volunteer ↔ site) | `routes/assignments.js`, `models/Assignment.js` | `pages/admin/AssignmentsPage.jsx` (also serves site_owner) |
| **Cloudinary uploads** (signed, direct-from-browser) | `routes/uploads.js` | `components/PhotoCapture.jsx` |
| **Payments** (Razorpay, donor sponsor flow) | `routes/payments.js`, `services/payments/paymentsService.js` | `pages/donor/SponsorTree.jsx` |
| **QR public verification** | `routes/publicTrees.js`, `pages/PublicTree.jsx` | — |
| **In-app QR scanner** | — | `pages/Scan.jsx` (html5-qrcode lazy) |
| **CO₂ estimation** (per-plant, per-donor, system; uses speciesRef rate when present) | `services/co2/co2Service.js`, `routes/co2.js` | `queries/co2.js`, consumed in DonorHome + AdminHome |
| **Certificates** (plantation + CO₂ PDF) | `routes/certificates.js`, `services/certificates/` | downloaded via `<a>` |
| **Bulk QR PDF** (3×5 grid A4) | inside `services/sites/` | DropdownMenuItem on site row |
| **Admin analytics** (charts) | `routes/analytics.js` | `pages/admin/AdminHome.jsx` (recharts) |
| **Excel import / export** | `routes/excel.js`, `services/excel/` | `pages/admin/ImportPage.jsx`, `components/ExportButton.jsx` |
| **Species master data** (NEW) | `routes/species.js`, `models/Species.js`, `services/species/speciesService.js` | `pages/admin/SpeciesPage.jsx`, `queries/species.js`; picker in `RecordPlanting.jsx` |
| **Project master data** (NEW) | `routes/projects.js`, `models/Project.js`, `services/projects/projectService.js` | `pages/admin/ProjectsPage.jsx`, `queries/projects.js`; picker in `DonationsPage.jsx` AddAllocationForm |

**Plant** now carries optional `speciesRef` (ref to Species). **Allocation** now carries optional `project` (ref to Project). Both are back-compat — null on existing records.

---

## 5. Conventions / patterns to keep

### Server

- **Mongoose plugins are per-schema, not global.** `schema.plugin(jsonTransformPlugin)` + `schema.plugin(softDeletePlugin)` on every model. A global `mongoose.plugin()` does not fire on schemas defined before `mongoose.connect()`, so models would leak `passwordHash` etc. Don't switch back to global.
- **Routes are thin:** middleware → controller. Controllers parse with a Zod schema and call a service. Services own all DB + business rules.
- **Role scoping happens inside services**, not at the route layer (except for the ngo_admin-only writes). This keeps "site_owner can read but not write" logic in one place. See `plantService.plantReadFilter` and `donationService.allocationReadFilter` + `resolveScopes`.
- **All list endpoints accept `page` + `limit` (Zod `.max(500)`)**. Schemas were raised from 100 → 500 because Selects need long lists. Don't lower it without raising frontend pickers.
- **Soft delete** via `softDeletePlugin` — never hard-delete user-facing data. `findOne` etc. already filters `deletedAt: null`.
- **Errors:** throw `HttpError.badRequest/.forbidden/.notFound/.server`. The `errorHandler` middleware turns them into JSON.
- **Async route handlers**: wrap with `asyncHandler(...)` — no try/catch in controllers.

### Client

- **One file per resource in `queries/`** — exports `xxxKeys`, a `useXxx` list hook, a `useXxx` detail hook, and `useCreate/Update/Delete` mutations. Mutations invalidate the keys.
- **Lazy-load every page** in `app/router.jsx` via `React.lazy`. Don't import a page eagerly there.
- **Update `navConfig.js` AND `router.jsx`** when adding a route. They are two sources but kept in sync by convention.
- **PageHeader + bento-card** are the layout primitives. New pages should start with `<PageHeader …/>` then content in `<div className="bento-card …">`.
- **z-index:** Select + DropdownMenu use `z-[60]` so they pop above Dialog (which is `z-50`). Don't break that ordering.
- **Tailwind:** no `xs` breakpoint configured. Custom screens: only `2xl: 1440px`. Use `sm:` (640px) as the smallest media qualifier.

---

## 6. Gotchas / past pitfalls

- **mongodb-memory-server is intentionally not installed.** First attempt took >15 min downloading. We pivoted to DB-free regression tests (`test/regression.test.js`, 11 checks). `test/auth-flow.test.js` still imports `mongodb-memory-server` at the top, so `npm run test:e2e` crashes with `ERR_MODULE_NOT_FOUND` until that dep is installed. Treat the e2e file as parked — don't run it in CI, don't add the dep back unless you accept the download cost.
- **OTP regex bug:** matching `\b\d{6}\b` against email HTML matched CSS hex `#047857`. Always strip HTML tags before extracting the OTP. See `extractMailHints()`.
- **`/api/users` is scoped, not blanket-admin.** Site owners can hit it with `?role=volunteer` and get only volunteers in their pool (their `createdBy` set OR volunteers assigned to their sites). Don't re-gate it behind `requireNgoAdmin`.
- **CORS / Vite proxy:** the client uses `/api/*` paths and Vite proxies to `http://localhost:4000`. `vite.config.js` has `host: true` + `allowedHosts: true` so ngrok/phone testing works. Don't add a manual `VITE_API_URL`.
- **Don't `.toObject()` on a Mongoose doc that is about to be JWT-signed.** The transform plugin strips `_id`, which becomes the sub claim. Return the doc directly.
- **Don't restart the dev server on port 4000 if one is already running** — you'll get EADDRINUSE. The user typically has `npm run dev` open in a terminal.
- **`pdfkit` and `xlsx` are CommonJS.** Import them as default.
- **`html5-qrcode` must be cleaned up on unmount** — the Scan page handles this. Don't render it unconditionally.
- **`html5-qrcode` `facingMode` must be a plain string** — passing `{ ideal: 'environment' }` crashes the native webview. Use `'environment'` directly.
- **pdfkit `margin: 0` required for QR sheets** — pdfkit's default margin produces a phantom second (or third) page in the bulk QR PDF. Always pass `{ margins: { top: 0, left: 0, bottom: 0, right: 0 } }`.
- **`npx cap sync` after every web build** — forgetting this means the native shell runs stale JS. There is no automatic watch.
- **iOS `Info.plist` needs two keys** — `NSCameraUsageDescription` and `NSLocationWhenInUseUsageDescription` must both be present or the app is rejected by the App Store and crashes on permission request in TestFlight.

---

## 7. Environment

`server/.env` (gitignored). `server/.env.example` has the shape. Required for full functionality:

```
MONGODB_URI=                          # mongodb://localhost:27017/angio
JWT_ACCESS_SECRET=                    # min 32 chars
JWT_REFRESH_SECRET=                   # min 32 chars
PRIMARY_NGO_ADMIN_EMAIL=              # seed admin's email
PRIMARY_NGO_ADMIN_PASSWORD=           # seed admin's password
MAIL_HOST=smtp.gmail.com              # for real OTP/email; omit to use console fallback
MAIL_USER=
MAIL_PASS=                            # Gmail app password (NOT account password)
MAIL_FROM_EMAIL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=                      # test keys are fine
RAZORPAY_KEY_SECRET=
TREE_UNIT_PRICE_INR=200               # default price per tree
```

`client/.env` (also gitignored): typically only `VITE_GOOGLE_MAPS_API_KEY`. `VITE_API_URL` is **not** needed thanks to the Vite proxy.

**Never commit `.env`.** Treat any creds visible in chat as compromised — rotate before going to prod.

---

## 8. Dev workflow

```bash
# from repo root
npm run dev          # boots server (4000) + client (5173) via concurrently

# server-only
cd server
npm run dev          # node --watch src/server.js
npm test             # DB-free regression suite (11 checks)
npm run test:e2e     # auth-flow e2e — CRASHES unless mongodb-memory-server is installed; see gotchas

# client-only
cd client
npm run dev          # vite
npm run build        # production build (use to smoke-check imports compile)
```

**Quick smoke checks I run after changes:**
- `node -e "import('./src/app.js').then(m => m.createApp())"` from `server/` — catches import path typos
- `npx vite build` from `client/` — catches JSX/import errors

---

## 9. Mobile & deploy

### Build and open in Xcode / Android Studio

```bash
cd client
npm run build        # Vite production build → dist/
npx cap sync         # copy dist/ into ios/ and android/, sync plugins
npx cap open ios     # open Xcode
npx cap open android # open Android Studio
```

Run `npx cap sync` after every `npm run build`. Without it the native shell still has stale JS.

### Bearer-auth model (native)

On a native build the API is a different origin from the `capacitor://localhost` webview, so httpOnly cookies don't travel. The native lib:
1. `nativeAuth.js` — stores access + refresh tokens in Capacitor Preferences (Keychain on iOS). Provides a synchronous `getAccessToken()` used by `api.js` to attach `Authorization: Bearer <token>` and `X-Client: native` headers on every request.
2. `nativePermissions.js` — `primeNativePermissions()` requests camera + location once after login so OS prompts appear early. `ensureCameraPermission()` / `ensureLocationPermission()` are point-of-use gates that short-circuit on web (always return `'granted'`).
3. `nativeFile.js` — `openAuthedPdf(apiPath, filename)` fetches PDFs with the Bearer token, writes to `Directory.Cache`, and invokes `Share.share()` → iOS share sheet (Print / Save to Files / Open In…). On web it just calls `window.open()`.

### What to set before shipping a native build

- `client/.env.production` → `VITE_API_BASE_URL=https://api.example.com` (the deployed API, not localhost).
- Rebuild + sync: `npm run build && npx cap sync`.

→ See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full VPS + Docker runbook.

---

## 10. What's left

| # | Status | Item |
|---|---|---|
| 1 | **Done** | Manual end-to-end walkthrough of every flow on a real device |
| 2 | Open | Don't re-enter temp password on first forced-password-change reset (UX issue) |
| 3 | **Done** | Set `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` for HTTPS prod |
| 4 | **Done** | Native PDF open via share sheet (iOS) — `nativeFile.js` |
| 5 | **Done** | Native permission priming on first authed screen — `nativePermissions.js` |
| 6 | Open | Sentry error tracking |
| 7 | Open | CI/CD pipeline on `main` |
| 8 | **Done** | Docker + Caddy production deploy |
| 10 | Open | Host the web client and set `CLIENT_ORIGIN` to its URL so QR scan links resolve |

All modules from the original SRS are implemented:
- 4 role dashboards, donation+allocation flow, plant capture with GPS + photo, weekly maintenance, monitoring extensions (height/DBH/health), QR + scanner + public tree page, payments, certificates (plantation + CO₂), admin analytics charts, Excel import/export, Species + Project master data, responsiveness, native mobile build.

---

## 11. Resume protocol for a fresh Claude session

1. Read this file.
2. `git log --oneline -20` to see what's landed recently.
3. Skim `client/src/app/router.jsx` and `server/src/app.js` for the current route inventory.
4. Ask the user what they want before assuming.

The user prefers:
- Terse responses; no trailing recap paragraphs.
- Tasks tracked via TaskCreate / TaskUpdate when work has 3+ steps.
- Reading a file before editing it (the harness requires it; don't skip).
- Per-schema plugins, no global Mongoose plugin.
- No new UI primitives unless a real second use-case exists — inline a styled `<button>` or `<textarea>` rather than scaffold a `Switch.jsx` / `Textarea.jsx` for a single page.
- Lucide icons, no emojis in UI.
