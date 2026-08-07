# Environ — Tree-Planting Transparency Platform · Project Overview

A production **MERN** platform that lets a tree-planting NGO tie every sponsored rupee to a specific, geo-tagged, photographed tree — with weekly maintenance proof and a public QR verification page per tree. Four roles, one role-aware app, shipped to **web + native iOS/Android** from a single React codebase.

> Built MERN. Four roles. End-to-end audit trail from a rupee paid to a tree growing — geo-tagged, photographed, and re-verified every week.

---

## What the Platform Does

Sponsors order trees; the NGO admin assigns each order to a planting site; volunteers and site incharges record geo-tagged, photographed plantings from the field; the incharge links real trees to sponsor orders; and sponsors get a verifiable, read-only view of exactly the trees their money funded — on a map, in a photo gallery, with every weekly watering log and an estimated CO₂ figure (in tonnes).

Real-world workflows running on it:
- **Sponsor orders** — offline (admin-recorded) or online (Razorpay), placed without a site; the admin assigns the site afterwards
- **Field planting capture** — required device GPS + rear-camera photo, recorded as *unassigned* trees
- **Order fulfilment** — the site incharge assigns existing unassigned trees to a sponsor's order (Pending → Completed)
- **Weekly maintenance (watering) proof** — photo + optional height / trunk-diameter / health measurements
- **Per-tree QR codes** → a public, no-login verification page anyone can scan
- **Bulk import** of the NGO's pre-app plantation survey data
- **Per-species CO₂ estimation** + PDF plantation / CO₂ certificates

---

## Tech Stack

**Frontend**
- React 18 (JSX, no TypeScript) + Vite
- Tailwind CSS 3 + shadcn/ui (Radix primitives) — **one role-aware app**, not four
- TanStack React Query v5 (server state) · React Router 6 (role-gated, suspense-lazy route chunks)
- React Hook Form + Zod resolver — shared form/table primitives
- Leaflet + OpenStreetMap — per-tree maps with a graceful list fallback (no map API key required)
- html5-qrcode (in-app QR scanner) · recharts (admin analytics) · Framer Motion (public landing)
- i18n-ready design tokens; Lucide icon set (no emoji icons — design-system rule)

**Backend**
- Node 20 · Express 4 · **pure ESM** (no build step)
- MongoDB via **Mongoose 8** — the sole datastore
- JWT access + refresh — **dual-mode**: httpOnly cookies (web) / `Authorization: Bearer` (native)
- Zod input validation · Pino structured logs · bcrypt (12 rounds)
- Per-schema Mongoose plugins (soft-delete + JSON transform) · partial unique indexes

**Integrations**
- **Cloudinary** — signed, direct-from-browser photo upload (the server never proxies image bytes)
- **Razorpay** — online order create + HMAC-SHA256 signature verify + server-to-server webhook
- **Resend / Nodemailer (Gmail SMTP)** — OTP + transactional mail, with a console fallback for test TLDs
- **pdfkit** — plantation + CO₂ certificate PDFs and bulk QR sheets
- **qrcode** — per-tree QR PNGs
- **xlsx (SheetJS)** — Excel import/export and the one-time historical-data seed

**Mobile & Infra**
- **Capacitor 8** — the same React app bundled to iOS + Android (camera, geolocation, preferences, filesystem, share)
- Docker Compose (mongo + server + caddy + web) · **Caddy 2** auto-TLS edge
- GitHub Actions CI/CD — test → SSH deploy on push to `main`; separate staging + production
- **Three delivery channels off one codebase**: native app, hosted web SPA, shared API

---

## Major Systems I Built

### 1. Multi-role auth & security
- JWT access + refresh, dual-mode (httpOnly cookies on web, Bearer tokens on the Capacitor native shell)
- `tokenVersion` invalidation (password change / deactivation kills every live session) + a TTL-indexed **JTI blacklist** for explicit logout
- **2-step OTP login for every role** (password → emailed 6-digit code), 5-min expiry with attempt + per-email rate limits
- Login lockout, forced-password-change flow, OTP-based password reset, and **no email enumeration**
- Soft-delete on every collection; a per-schema JSON transform strips `_id` / `__v` / `passwordHash` from every response

### 2. Role-based access control (4 roles, server-enforced)
- `ngo_admin` · `site_owner` (incharge) · `sponsor` · `volunteer` — one React app with role-aware nav + routes
- Every action gated **server-side** (own-site, own-plant, and donor-scoped filters); the UI only hides what the API already rejects with 403 — hand-crafted requests still bounce

### 3. Order → allocation → fulfilment lifecycle
- Sponsors order N trees (offline via admin, or online via Razorpay) **with no site chosen**
- Admin assigns a site → auto-creates an `Allocation` (target count); unassigned orders are filterable (Assigned / Unassigned)
- **Planting is decoupled from orders** — volunteers and the incharge record trees *unassigned* (no sponsor step)
- The incharge fulfils an order by assigning existing unassigned trees on the site — capped to the order size, eligibility re-checked server-side; each order tracks planted / remaining / fulfilled and flips **Pending → Completed**

### 4. Field-first capture (the volunteer / incharge workflow)
- Step-gated planting **and** watering wizards — a person in the field can't skip GPS or the photo
- **Required, device-only GPS** — deliberately no manual lat/lng entry, so a tree's coordinates always reflect where the person physically stood; denied / unavailable / timeout each get an actionable message
- Rear-camera capture (`capture="environment"`) + Cloudinary **signed direct upload** straight from the phone

### 5. Plant lifecycle + public verification
- Geo-tagged plants with a first-day photo; weekly maintenance logs (photo + optional height / DBH / health / disease notes)
- A non-guessable per-tree `publicCode` → QR → **public, no-login verification page** (scan count + last-scanned tracked)
- Bulk QR PDF sheets for printing stickers (pdfkit)

### 6. Species master data + CO₂ estimation
- A species catalog with a per-species CO₂ absorption rate; every tree links to it via `speciesRef` (re-assignable from the plant detail page)
- CO₂ reported **in tonnes everywhere** (dashboard, site stats, orders, sponsor certificate); estimate = *age × species-rate*, with a **measured survey value** used for imported historical trees

### 7. Historical data import + idempotent boot seed
- The NGO's pre-app survey spreadsheet → parsed to a committed JSON file → an **idempotent, non-fatal boot seed**
- Historical trees are modeled with `origin: 'historical'` and their full survey measurements (survival, health, canopy, RCD, biomass, CO₂) preserved in a sub-document; `donor` / `allocation` / `geo` / `plantingPhoto` were relaxed to **optional at the model level** (the live planting API still requires geo + photo via Zod) so pre-app data coexists with app-recorded data
- The seed auto-creates a neutral holding site (no pre-existing site required), and is keyed globally by source-row id so it's safe across restarts and tree-moves

### 8. Certificates & payments
- pdfkit-generated plantation + CO₂ certificates, scoped per sponsor
- Razorpay online order flow with HMAC signature verification and webhook reconciliation for out-of-band capture/failure events

### 9. Native mobile (Capacitor)
- One React app bundled to iOS + Android; runtime-selected dual-mode auth; native camera / geolocation / permission-priming; authed PDF fetch → the OS share/print sheet

### 10. Admin tooling
- Users / sites / donations / plants / species / assignments management, analytics charts (recharts), Excel import/export, per-site detail with live order progress, and an admin donations **Assigned / Unassigned** filter

---

## Codebase Scale

- **Backend**: ~75 source files · **12 Mongoose models** · **18 route files** · **13 service domains** · **11 DB-free regression tests** (they run without a live Mongo)
- **Frontend**: ~60 source files · ~30 feature pages across 4 roles · lazy-split route chunks per page
- **Delivery**: web SPA + native iOS/Android + a shared API, all from one codebase
- **Docs**: README · ARCHITECTURE · DEPLOYMENT · ENV · GOING-LIVE (go-live checklist) · HANDOFF (build-state log) · per-package READMEs

---

## Notable Engineering Decisions

- **MongoDB as the single source of truth** — no external queue or scheduler; durable behavior via persisted state + idempotent, race-safe operations.
- **Per-schema Mongoose plugins, not global** — a global soft-delete/JSON-transform plugin silently *didn't fire* because models load before the plugin registers; moving it per-schema fixed a real production bug (and the lesson is documented).
- **Pure ESM, no TypeScript** — runtime simplicity and zero build-step overhead for a solo/small-team build.
- **Dual-mode auth from one codebase** — cookies for the web SPA, Bearer tokens for the Capacitor shell, chosen at runtime from `Capacitor.isNativePlatform()`.
- **Signed direct-from-browser uploads** — the Node server never touches image bytes; it only signs the Cloudinary request with `folder` + `public_id` pinned so the client can't redirect uploads.
- **Decoupled planting from orders** — the field team plants freely (unassigned trees) and the incharge later matches real trees to real orders, so field work is never blocked on sponsorship state.
- **Optional-reference historical model** — relaxing `donor` / `allocation` / `geo` / `photo` to optional (while the live API keeps them required via Zod) let a month of pre-app survey data live alongside app data without forking the schema — every downstream read was audited for null-safety first.

---

## Deployment

- **Docker Compose**: MongoDB + Node/Express API + Caddy (edge, auto-TLS) + a Caddy-served static web SPA (SPA fallback on 404)
- **GitHub Actions**: test → SSH deploy on push to `main`; separate staging / production Caddy configs and domains
- A one-time, idempotent **historical-data seed** toggled in the server entrypoint, then commented off once production is seeded (re-enabling is harmless — it's idempotent)
- QR scan links open the hosted web verification page, so a sticker works in any browser without the native app

---

## Skills Demonstrated

- Full-stack **MERN** product development at production scale
- Multi-role **RBAC** with strict server-side, per-user data isolation
- Event/state modeling for an **order → fulfilment** lifecycle (Pending / Completed, capped assignment, idempotent progress)
- Third-party integration depth — Cloudinary, Razorpay, Resend/SMTP, Leaflet/OpenStreetMap
- **Field-first mobile UX** — required device GPS, rear-camera capture, step-gated capture that tolerates patchy connections
- **Native mobile delivery via Capacitor** — one codebase → iOS + Android + web
- PDF + QR generation and **public, no-login verification pages**
- **Data migration / bulk import** with an idempotent, non-fatal boot seed and schema-relaxation strategy
- Auth & security depth — JWT rotation, all-role OTP, lockout, soft-delete, no email enumeration
- **Docker + Caddy auto-TLS + GitHub Actions** CI/CD

---

*Single-tenant by design (one NGO per deployment); multi-tenancy is intentionally out of scope.*
