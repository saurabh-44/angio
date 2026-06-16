# NGO Trees

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
| **NGO admin** | Top-level. Creates user accounts. Records donations. Allocates each donation across one or more sites. Sees every plant, log, and assignment in the system. The seeded "primary" admin is the only account that can create other NGO admins. |
| **Site owner** | Owns a plot of empty land. Adds volunteers to their own pool. Assigns volunteers to their sites. Sees plants and maintenance logs on their own sites only — never another owner's. |
| **Volunteer** | Receives field assignments. Records each planting (site, allocation, species, GPS, photo). Records weekly watering (plant, photo, note). Sees only their own assignments and submissions. |
| **Donor** | Read-only. Sees only trees their money funded — on a Google Map, in a photo gallery, with full maintenance history per tree. Sees total donated and per-donation breakdown. |

**The trust chain, end-to-end:**

```
Donor          Donation        Allocation              Plant                   Maintenance log
  │              │               │                       │                          │
  ├──pays the─→  │               │                       │                          │
  │              ├─NGO admin─→   │                       │                          │
  │              │   allocates   │                       │                          │
  │              │               ├─volunteer plants─→    │                          │
  │              │               │   with GPS + photo    │                          │
  │              │               │                       ├─volunteer waters─→       │
  │              │               │                       │   every week with photo  │
  │              │               │                       │                          │
  ↓              ↓               ↓                       ↓                          ↓
  Visible to donor on /donor/ — every step is auditable, photographed, and time-stamped.
```

The donor doesn't pick sites; the NGO admin does. But the donor sees exactly which sites their money covered, with the per-site target plant count and amount allocated, and then every actual tree as it goes in the ground.

---

## How allocations work (the donation-to-sites bridge)

Each `Donation` from a donor splits into one or more `Allocation` rows. Each allocation pins a slice of the donation to a specific site with a target plant count:

```
Donation: Ananya Rao paid ₹10,000 on 2026-06-08 (UPI)
├── Allocation #1 → Site A (target 50 trees, ₹6,000)
└── Allocation #2 → Site B (target 30 trees, ₹4,000)
                                 ↑
        Volunteers plant trees on Site A "under Allocation #1"
        — each Plant record stores the allocation it belongs to.
        Plant.donor is denormalised from the allocation, so donor
        reads are fast even with 50,000 plants in the system.
```

When a volunteer opens `/volunteer/plant` and picks a site they're assigned to, the form asks them to pick *which donor's funding* this tree is being planted under. That's the link that makes `/donor/trees` show only the trees a specific donor's money paid for.

A site can be referenced by many allocations from many donors — that's the common case. One tree belongs to exactly one allocation.

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
| Record plantings | ✓ | own sites | own assignments | — |
| Record weekly maintenance | ✓ | own sites | own assignments | — |
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
- **GPS capture** via the browser Geolocation API with `enableHighAccuracy: true`. Big "Capture my location" button, plus manual lat/lng inputs for when GPS is unreliable.
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
│   /api/auth  /api/users  /api/sites  /api/donations                │
│   /api/allocations  /api/plants  /api/maintenance                  │
│   /api/assignments  /api/uploads  /api/health                      │
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
5. **Site owner signs in** (real OTP), adds another volunteer to their own pool, assigns them to their site.
6. **Volunteer signs in** on a phone via ngrok (OTP from console).
   - `/volunteer/plant` → site → allocation → species → GPS capture → camera photo → submit.
   - `/volunteer/maintenance` (a week later) → pick the plant → fresh photo → submit.
7. **Donor signs in** → `/donor` shows the funded tree on the recently-planted strip, `/donor/map` drops a pin on the Google Map, `/donor/trees` shows the photo card, `/donor/maintenance` shows the weekly photo.

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
│       │                   MaintenanceLog · Assignment · OtpRequest
│       │                   JwtBlacklist · plugins/{softDelete, jsonTransform}
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
        │   ├── admin/              Home, Users, Sites, Donations, Plants, Maintenance, Assignments
        │   ├── site/               SiteHome (reuses admin pages with role-aware UI)
        │   ├── donor/              DonorHome · Trees · Map · Maintenance · Donations
        │   └── volunteer/          Home · Assignments · RecordPlanting · RecordMaintenance
        ├── components/
        │   ├── ui/                 shadcn primitives
        │   ├── AppLayout.jsx · Sidebar · TopBar · UserMenu
        │   ├── AuthShell.jsx · OtpInput.jsx
        │   ├── PageHeader · StatTile · EmptyState · Pagination · ConfirmDialog · RoleBadge
        │   ├── PlantCard · PlantStatusBadge · PlantDetailSheet
        │   ├── MapView                ← Google Maps + fallback list
        │   ├── PhotoCapture           ← Cloudinary direct upload widget
        │   └── GpsCapture             ← Geolocation API widget
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
