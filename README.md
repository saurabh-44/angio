# Environ

A transparency platform that lets donors see every tree their donation funded — geo-tagged, photographed, and maintained on a verifiable weekly schedule.

> Built MERN. Four roles. End-to-end audit trail from a rupee paid to a tree growing.

---

## The problem this solves

A small environmental NGO collects donations to plant trees. The money flows in, the planting happens somewhere, and a year later the NGO writes a PDF report saying "we planted N trees." Donors have no way to know:

- **Did the trees actually get planted?** Or did the money disappear into operating costs?
- **Where are they?** "Somewhere in three districts" isn't an answer.
- **Are they still alive?** A tree planted and never watered dies in a month.
- **Who's responsible** when something goes wrong?

The NGO meanwhile has its own operational pain:

- It owns relationships with **landowners** (site owners) who provide empty plots for planting.
- It coordinates **volunteers** who actually do the planting and weekly watering.
- One donation is rarely just one site — the NGO splits a contribution across multiple plots based on capacity and season.
- The NGO admin can't personally verify every tree on every site — but the donor expects them to.

Existing tools (Excel sheets, WhatsApp groups, PDF reports) don't scale and don't build trust. **Donors stop giving because they can't see results.**

---

## What this app does about it

A single web app that ties every donated rupee to a specific tree, in a specific GPS-pinned location, with a planting photo and a fresh maintenance photo every week.

**Four roles, all isolated from each other:**

| Role | What they see and do |
|---|---|
| **NGO admin** | Top-level. Creates user accounts. Records donations — **with a site (auto-allocated) or without one (unassigned)**. Allocates unassigned donations to sites. Manages the **Species** master data + per-species CO₂ rates. Filters donations by **Assigned / Unassigned**. Sees every plant, log, order, and assignment. The seeded "primary" admin is the only account that can create other NGO admins. |
| **Site incharge (a.k.a. site owner)** | Owns a plot of empty land. Adds volunteers to their own pool and assigns them to sites. **Records plantings and watering on their own sites** (like a volunteer, plus more powers). **Sees order requests on their sites and assigns unassigned trees to fulfil them** (pending → completed). Can move unassigned trees between sites. Sees plants + logs on their own sites only. |
| **Volunteer** | Receives field assignments. Records each planting (site → species → GPS → photo) as an **unassigned** tree — **cannot pick a sponsor or fulfil an order**. Records weekly watering (plant, GPS, photo, note). Sees only their own assignments and submissions. |
| **Sponsor (donor)** | Places an order for **a number of trees — the NGO admin assigns the site afterwards** (no site-picker). Read-only after that: sees the trees linked to their order on a Google Map, in a photo gallery, with full weekly maintenance history and estimated CO₂ (in **tonnes**). |

**The trust chain, end-to-end:**

```
Sponsor        Order (Donation)   Site + Allocation      Plant                    Maintenance log
  │              │                  (admin assigns)        │                          │
  ├─orders N ─→  │                                         │                          │
  │  trees       ├─NGO admin ────→                         │                          │
  │              │  assigns site   ┌ volunteer/incharge ─→ │  (recorded UNASSIGNED)   │
  │              │                 │  plants w/ GPS+photo   │                          │
  │              │                 └ incharge assigns ────→ │  (now linked to order)   │
  │              │                    trees to the order    ├ incharge/volunteer ──→   │
  │              │                                          │  waters weekly w/ photo  │
  ↓              ↓                                          ↓                          ↓
  Visible to the sponsor on /sponsor/ — every step is auditable, photographed, and time-stamped.
```

The sponsor doesn't pick a site — they just order a number of trees, and the **NGO admin assigns the site** afterwards. Trees are recorded **unassigned** in the field (by volunteers or the incharge); the **site incharge** then links existing unassigned trees to the sponsor's order. The sponsor then sees exactly those trees, with the site, target count, and every actual tree as it goes in the ground.

---

## How orders, allocations & fulfilment work

A sponsor's **order** is a `Donation`. When the NGO admin records it (or a sponsor pays online) it may or may not carry a site:

- **With a site** → an `Allocation` is auto-created, pinning a target plant count to that site. The order is **Assigned**.
- **Without a site** → the donation is **Unassigned**; it shows in the admin's *Unassigned* filter until the admin allocates it to a site.

Crucially, **trees are no longer planted "under" an order.** Volunteers and the incharge record trees **unassigned** (no donor, no allocation). Fulfilment is a separate step done by the **site incharge** (or admin):

```
Order: Ananya Rao ordered 5 trees  ─→ admin assigns Site A ─→ Allocation (target 5)
                                                                  │
   Site A already has unassigned trees (planted by volunteers/incharge)
                                                                  │
   Incharge opens the order on their dashboard → "Assign trees" →
   picks 5 unassigned trees on Site A → each Plant's donor + allocation
   are set → the order flips from Pending to Completed.
```

`Plant.donor` is denormalised from the allocation at assignment time, so donor reads stay fast even at scale. One tree belongs to at most **one** order; a tree can also stay **unassigned indefinitely** (e.g. the NGO's bulk-imported historical trees). This split lets the field team plant freely and lets the incharge match real trees to real orders — the sponsor still ends up seeing exactly the trees fulfilling their order.

---

## Species, CO₂ estimates & historical trees

- **Species master data** (`/admin/species`) drives the volunteer's species picker **and** a per-species CO₂ absorption rate. Each tree links to a `Species` via `speciesRef`; set a species' rate (entered in **tonnes/year** in the UI, stored as kg internally) and every tree of that species gets an accurate estimate. An admin can also (re)assign a tree's species from the plant detail page.
- **CO₂ is reported in tonnes everywhere** — admin dashboard, site stats, orders, and the sponsor certificate PDF. A tree estimates carbon from *age × species rate* (default ~22 kg/yr) — **except bulk-imported historical trees**, which carry a real surveyed figure and report that **measured** value instead.
- **Historical (pre-app) trees.** The NGO's existing plantation records (a survey spreadsheet) are imported as `Plant`s with `origin: 'historical'` — no sponsor, no photo — preserving their full survey measurements (survival, health, canopy, RCD, AGB/BGB, CO₂ tonnes) in a `historical` sub-document. They're seeded into a neutral holding site; an admin then **moves** them to real sites and the incharge **assigns** them to sponsor orders as they come in. To support this, `Plant.donor`, `allocation`, `geo`, and `plantingPhoto` are all **optional** at the model level (the live planting API still requires geo + photo via Zod). The one-time seed runs on boot from a committed JSON file and is idempotent + non-fatal; comment it out once production is seeded.

---

## Roles in code: the permission grid

| Action | NGO admin | Site owner | Volunteer | Donor |
|---|:-:|:-:|:-:|:-:|
| Create users (any role) | ✓ | volunteer only* | — | — |
| List users | ✓ | volunteer only (own pool) | — | — |
| Create sites | ✓ | — | — | — |
| Edit sites | ✓ | own only | — | — |
| Record donations | ✓ | — | — | — |
| Allocate donations to sites | ✓ | — | — | — |
| Assign volunteers to sites | ✓ | own sites only | — | — |
| Record plantings (unassigned trees) | ✓ | own sites | own assignments | — |
| Record weekly maintenance | ✓ | own sites | own assignments | — |
| **Assign existing trees to an order** | ✓ | own sites | **—** | — |
| **Move unassigned trees between sites** | ✓ | — | — | — |
| **Manage species + CO₂ rates** | ✓ | — | — | — |
| View plants | all | on own sites | own | own only |
| View maintenance logs | all | on own sites | own | own only |
| View map of trees | all | own sites | own | own only |

*A site owner can only add **volunteers**, not other site owners / donors / admins. When they create a volunteer, `User.createdBy` is stamped with the site owner's id. Other site owners can't see or assign that volunteer until the NGO admin explicitly "shares" them by assigning the volunteer to another owner's site.

Everything is enforced **server-side** — the UI hides actions the user can't perform, but if someone hand-crafts a request, the API still rejects with 403.

---

## Authentication & security highlights

- **JWT** access + refresh tokens, both in **httpOnly cookies**. Frontend never sees the tokens.
- **Token versioning**: every user has a `tokenVersion`. Bumped on password change / deactivation / account removal → every existing session for that user dies instantly.
- **JWT JTI blacklist**: explicit logout adds the access-token JTI to a Mongo-backed revocation list with a TTL index (auto-cleanup).
- **2-step login for everyone**: password → emailed 6-digit OTP → cookies. OTP expires in 5 min, max 5 attempts, max 3 codes per email per 15 min (server-rate-limited). Same flow for `donor` / `volunteer` / `site_owner` / `ngo_admin`.
- **Login lockout**: 5 wrong passwords on one account → 15-min lock.
- **Forced password change**: when an NGO admin creates an account, the user is mailed a temp password and the `forcePasswordChange` flag is set. Every gated route returns `PASSWORD_CHANGE_REQUIRED` until the user rotates the password.
- **Password reset is OTP-based** (not link-based) for every role.
- **Soft delete** on every collection — nothing is hard-deleted. Email is unique-among-live-users (partial unique index), so a removed user's email can be re-onboarded later.
- **Per-schema JSON transform** strips `_id` (→ `id`), `__v`, and `passwordHash` from every response. (Caught a real bug: as a global Mongoose plugin this didn't fire because models loaded before the plugin was registered; moving it to per-schema fixed it.)
- **No email enumeration**: `/auth/forgot-password` always responds `ok`, regardless of whether the email exists.

---

## Field-tooling highlights (the volunteer workflow)

This is the hardest UX on the platform — volunteers are using phones in the field, on patchy connections, while standing in front of a sapling.

- **Step-by-step wizard** on `/volunteer/plant` and `/volunteer/maintenance`. Each step is gated by the previous so a volunteer in the field can't accidentally skip GPS or photo.
- **GPS capture** via the browser Geolocation API with `enableHighAccuracy: true` — **required and device-only**. There is deliberately **no manual lat/lng entry**, so a planting's coordinates always reflect where the volunteer physically stood. Both planting **and** weekly watering capture live GPS; the photo step is gated behind it. Permission-denied / unavailable / timeout each get an actionable message.
- **Camera capture**: `<input type="file" capture="environment">` opens the rear camera directly on phones, not a file picker.
- **Cloudinary signed direct upload**: the volunteer's phone uploads the photo bytes **straight to api.cloudinary.com** — Node never proxies them. Backend just signs the request with `folder` + `public_id` pinned so the client can't redirect uploads.
- **Big sticky-bottom submit** with clear ready/not-ready states. Lock-screen-friendly tap targets (44px+).

---

## Architecture at a glance

```
┌────────────────────────────────────────────────────────────────────┐
│                            Phone / browser                         │
│  React 18 + Vite + Tailwind + shadcn/ui + TanStack Query + Framer  │
│                                                                    │
│   Public landing  ·  4 role dashboards  ·  Google Maps             │
│              ┃ same-origin /api/* calls via Vite proxy             │
└──────────────┃─────────────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────────┐
│                          Node 20 + Express                         │
│                                                                    │
│   /api/auth  /api/users  /api/sites  /api/donations  /api/species  │
│   /api/allocations (+ /:id/attach-plants)  /api/plants (+ move-site)│
│   /api/maintenance  /api/co2  /api/certificates  /api/analytics    │
│   /api/assignments  /api/uploads  /api/excel  /api/payments  /health│
│                                                                    │
│   Zod-validated input · JWT cookie auth · Mongoose models          │
│              ┃                                ┃                    │
│              ┃ photos: direct from phone      ┃                    │
│              ┃ (server signs only)            ┃                    │
└──────────────┃────────────────────────────────┃────────────────────┘
       ┌───────▼──────────┐               ┌─────▼─────┐
       │   Cloudinary     │               │  MongoDB  │
       │   image CDN      │               │  Atlas /  │
       │                  │               │  local    │
       └──────────────────┘               └───────────┘
               ▲                                ▲
               │ planting + weekly photos       │ all domain state
               │                                │
               └────── Resend / SMTP (Gmail) ───┘
                       OTPs & temp passwords
```

---

## Tech stack

**Server** (`server/`)
- Node 20+, Express 4, ESM modules
- MongoDB via Mongoose 8 (soft-delete plugin, JSON transform plugin, partial unique indexes)
- JWT (`jsonwebtoken`), bcrypt (12 rounds)
- Zod for input validation, Pino for structured logs
- Resend (preferred) or Nodemailer SMTP for mail (Gmail app-password works)
- Cloudinary SDK for signed-upload params

**Client** (`client/`)
- React 18 + Vite
- TailwindCSS + shadcn/ui primitives (button, input, dialog, sheet, select, table, dropdown, toast)
- TanStack React Query for server state
- React Router v6 with role-aware private routes + suspense-lazy chunks per page
- `@react-google-maps/api` for the donor map view (gracefully falls back to a list when the API key is missing)
- React Hook Form + Zod resolver for form validation
- Framer Motion for the public landing animations (3D mouse-tilt on cards, floating leaves, scroll fade-ups; all respect `prefers-reduced-motion`)
- `lucide-react` icon set (no emoji icons anywhere — design system rule)

**Design tokens**
- Bento-grid layout + organic biophilic accents (rounded 20px, soft natural shadows)
- Palette: emerald primary, amber CTA, slate text
- Typography: Plus Jakarta Sans headings, Inter body, JetBrains Mono for IDs/GPS
- Motion: 150–300ms color/opacity only on app surfaces; richer effects reserved for the landing page

---

## Running locally

### Prerequisites
- Node 20+
- npm
- MongoDB running on `mongodb://127.0.0.1:27017/angio`
  - Either install MongoDB Community Server and `Start-Service MongoDB` (admin PowerShell)
  - Or `docker run -d --name angio-mongo -p 27017:27017 mongo:7`

### One-time setup

```powershell
git clone <repo>
cd Angio
npm install          # installs concurrently at root
cd server; npm install; cd ..
cd client; npm install; cd ..

# Copy env templates
copy server\.env.example server\.env
copy client\.env.example client\.env
```

**Edit `server/.env`** at minimum:
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to long random values (≥ 32 chars each)
- `PRIMARY_NGO_ADMIN_EMAIL` to a real inbox you can read
- `PRIMARY_NGO_ADMIN_PASSWORD` (you'll be forced to change it on first login)
- For real emails: `MAIL_HOST`/`MAIL_USER`/`MAIL_PASS` (Gmail app password) or `RESEND_API_KEY`
- For real photo uploads: `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`

`client/.env` can be left as-is — Vite's dev proxy handles the API at same-origin.

### Run both at once

```powershell
npm run dev
```

That starts the server on `:4000` (`[server]` green prefix) and the client on `:5173` (`[client]` cyan prefix). `Ctrl+C` kills both.

Visit `http://localhost:5173`.

### Dev users seeded on first boot

When the server boots in development mode, it seeds **7 test users** in addition to the primary admin (idempotent — won't re-create them on later boots):

| Role | Email | Password |
|---|---|---|
| volunteer (×4) | `volunteer{1..4}@angio.test` | `Test1234!` |
| donor (×3) | `donor{1..3}@angio.test` | `Test1234!` |

The `.test` TLD triggers a special path in the mail config — emails to any `*.test`, `*.example`, `*.invalid`, `*.local`, or `*.localhost` address **skip SMTP entirely and log a high-visibility banner** with the OTP / temp password to the server console. So you can sign in as any of these without needing seven real inboxes.

### Field-testing on a phone via ngrok

```powershell
# Terminal 1: backend + frontend
npm run dev

# Terminal 2: tunnel the frontend
ngrok http 5173
```

Open the `https://xxxxx.ngrok-free.dev` URL on your phone. Same-origin `/api` requests are forwarded by Vite to localhost:4000, so cookies and camera-upload both work. Sign in as `volunteer1@angio.test` (OTP shows up in the laptop's `[server]` log), then `/volunteer/plant` opens the phone camera + GPS.

---

## End-to-end test path

The verification flow we walk after major changes:

1. **Primary admin signs in** (real Gmail, real OTP). Forced to set a real password.
2. **Admin creates** a donor (`donor1@angio.test`), a site owner (real email), and at least one volunteer.
3. **Admin creates a Site** with the site owner assigned as owner.
4. **Admin records a Donation** for the donor, opens it, **allocates** funds across one or more sites with target tree counts.
5. **Site incharge signs in** (real OTP), adds another volunteer to their own pool, assigns them to their site.
6. **Volunteer signs in** on a phone via ngrok (OTP from console).
   - `/volunteer/plant` → site → species → **live GPS** → camera photo → submit. The tree is recorded **unassigned**.
   - `/volunteer/maintenance` (a week later) → pick the plant → live GPS → fresh photo → submit.
7. **Sponsor orders** N trees (no site). **Admin assigns a site** to the order (Donations → allocate).
8. **Incharge fulfils the order** from their dashboard → "Assign trees" → picks unassigned trees on the site → order flips to **Completed**.
9. **Sponsor signs in** → `/sponsor` shows the tree on the recently-planted strip + CO₂ (tonnes), `/sponsor/map` drops a pin, `/sponsor/trees` shows the photo card, and each tree's weekly maintenance.

If any step breaks, the response JSON has a typed `error.code` + `error.message`; the browser console + the `[server]` log together pinpoint it.

---

## Repository layout

```
Angio/
├── package.json            ← root, runs server + client via concurrently
├── README.md               ← you are here
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── README.md           ← server-specific notes
│   └── src/
│       ├── app.js · server.js
│       ├── config/         env · db · cloudinary · mail
│       ├── models/         User · Site · Donation · Allocation · Plant
│       │                   MaintenanceLog · Assignment · Species · Project
│       │                   OtpRequest · PendingSignup · JwtBlacklist
│       │                   plugins/{softDelete, jsonTransform}
│       ├── data/           historicalPlants.json (committed seed data)
│       ├── services/       auth · users · sites · donations · plants · assignments
│       ├── middleware/     auth (requireAuth, requireRole) · validate · rateLimit · errorHandler
│       ├── controllers/    one per resource
│       ├── routes/         auth · users · sites · donations · allocations · plants
│       │                   maintenance · assignments · uploads · health
│       ├── mail/templates/ loginOtp · passwordResetOtp · passwordChanged · accountCreated
│       ├── validation/     zod schemas per resource
│       └── utils/          httpError · asyncHandler · logger
└── client/
    ├── package.json
    ├── vite.config.js      ← /api proxy to localhost:4000
    ├── index.html
    └── src/
        ├── main.jsx · App.jsx · index.css
        ├── app/
        │   ├── router.jsx          ← lazy-loaded routes + role gates
        │   ├── navConfig.js        ← role-specific sidebar items
        │   └── routes/             PrivateRoute · PublicOnlyRoute · PublicRoot · RoleHome
        ├── pages/
        │   ├── Landing.jsx         ← public marketing root, Framer Motion
        │   ├── auth/               Login · OtpVerify · Forgot · Reset · ChangePassword
        │   ├── admin/              Home · Users · Sites · SiteDetail · Donations · Plants · PlantDetail · Species · Maintenance · Assignments
        │   ├── site/               SiteHome (order requests + assign trees) · other pages reuse admin, role-scoped
        │   ├── sponsor/            SponsorHome · Trees · Map · Maintenance · Donations · Orders · Tree(order wizard) · Profile
        │   └── volunteer/          Home · Assignments · RecordPlanting · RecordMaintenance
        ├── components/
        │   ├── ui/                 shadcn primitives
        │   ├── AppLayout.jsx · Sidebar · TopBar · UserMenu
        │   ├── AuthShell.jsx · OtpInput.jsx
        │   ├── PageHeader · StatTile · EmptyState · Pagination · ConfirmDialog · RoleBadge
        │   ├── PlantCard · PlantStatusBadge · SponsorTreeDetail
        │   ├── AttachTreesPanel       ← assign unassigned trees to an order (admin + incharge)
        │   ├── PlantLocationMap       ← per-tree Google Map + fallback
        │   ├── PhotoCapture           ← Cloudinary direct upload widget
        │   └── GpsCapture             ← device-only Geolocation widget (no manual entry)
        ├── queries/                  TanStack hooks per resource
        └── lib/                      api · auth · queryClient · format · utils · passwordStrength
```

---

## Status

- Backend: ~75 source files, 11 regression tests (no DB needed)
- Client: ~60 source files, lazy-split routes (initial bundle ~335 KB pre-gzip)
- Production-ready for a single-NGO deployment. Multi-tenancy (multiple NGOs on one app) is **not** in scope — single-tenant by design.

---

## License

Internal project — license to be added.
