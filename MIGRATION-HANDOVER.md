# Angio — Migration & Handover

Angio moves off the developer's personal VPS onto the client's own VPS (`srv1843033`, `200.141.1.169`). After this migration the client owns the domain, the credentials, and the deploy pipeline. Nothing in production should depend on the developer's personal domain, IP, or third-party accounts.

The client's VPS **already runs Angio** — deployed 2026-07-24 and never cut over. It is stale, not broken:

| | Live (previous host) | Client VPS today | After migration |
|---|---|---|---|
| Code | `origin/main` | 8 commits behind | `origin/main` |
| `plants` | 112 | 3 | 112 |
| `users` | 24 | 18 | 24 |
| `allocations` | 15 | 10 | 15 |
| `donations` | 17 | 13 | 17 |
| `assignments` | 10 | 7 | 10 |
| `maintenanceLogs` | 3 | 1 | 3 |
| `sites` | 3 | 2 | 3 |
| DNS | pointed at previous host | — | client domain → `200.141.1.169` |

Its 3-plant snapshot was deploy-time test data — the box had never served traffic (DNS never pointed at it).

## Status — 2026-08-12

Data and code migration are **done**; only the client-owned pieces remain.

| Step | State |
|---|---|
| Live data restored to client VPS | ✅ 188 documents, all counts match the table below |
| Client VPS code brought to `origin/main` (`56bfc52`) | ✅ 45 files changed, 8 commits applied |
| Rebuilt and running | ✅ `angio-server-1`, `angio-web-1`, `angio-mongo-1` up; API health `{"ok":true}`; Mongo connected |
| Pre-migration snapshot of the client box's own data | ✅ kept at `/root/angio-preexisting-2026-08-12.archive.gz` |
| GitHub CI/CD repointed to this VPS (§8) | ✅ `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` updated; two deploys verified green, second one landed PR #28 (`7422208`) and rebuilt the web image |
| Client-owned deploy key `angio-deploy` | ✅ generated on the box, trusted in `authorized_keys` |
| Nightly Mongo backup | ✅ `~/backup-mongo.sh` + cron 02:30, keeps 14, first archive written |
| 2 GB swap | ✅ active, persisted in `/etc/fstab` |
| Domain + DNS (§3 step 7, §4) | ⬜ blocked — needs `<API_DOMAIN>` / `<APP_DOMAIN>` |
| Credentials moved to client-owned accounts (§4, §5, §6) | ⬜ blocked — needs the client's accounts |
| Developer's SSH keys removed from `authorized_keys` (§8) | ⬜ last step, after cutover |

**The old host is still serving live traffic** — it was restarted after the sync so users aren't cut off while the domain decision is pending. That means the client VPS's copy goes stale from now on: **re-run the dump/restore in §3 steps 1–3 immediately before cutover.** It takes under a minute and has been rehearsed end to end.

Configuration on the client VPS still carries the developer's domain (caddy labels, `CLIENT_ORIGIN`, `PUBLIC_URL`, `VITE_API_BASE_URL`). It is inert — no DNS resolves there, so no certificate is issued and nothing is served. It gets replaced in §4, not before, so the stack is never left in a half-configured state.

---

## 1. What you must supply before cutover

Nothing below can be inherited from the developer. Each is a hard blocker for the step that references it.

| Placeholder used in this doc | What it is | Blocks |
|---|---|---|
| `<API_DOMAIN>` | e.g. `api.yourdomain.org` | §3, §4 |
| `<APP_DOMAIN>` | e.g. `app.yourdomain.org` — the public web app | §3, §4 |
| `<ADMIN_EMAIL>` | seed/primary NGO admin login | §4 |
| `<MAIL_FROM_EMAIL>` | transactional sender address on your domain | §4 |
| Cloudinary account | image storage — cloud name, API key, API secret | §4, §5 |
| Resend (or SMTP) account | OTP + notification email delivery | §4 |
| Razorpay account | live payment keys + webhook secret | §4, §6 |

Your VPS already has a Cloudinary and a Resend key configured that are **not** the developer's — confirm they are yours and live before relying on them.

---

## 2. What runs on your VPS

Host `srv1843033` — Ubuntu 24.04, 1 vCPU, 3.8 GB RAM (**no swap**), 48 GB disk, Docker 29.6.2.
Application user: **`envirom`**. Everything runs as that user; `root` is only for host administration.

```
/home/envirom/angio     # the app — git clone of the repo + server/.env (gitignored)
/home/envirom/proxy     # shared edge reverse proxy, owns :80/:443
```

Four containers:

| Container | Image | Role |
|---|---|---|
| `angio-server-1` | built from `server/` | Node API, port 4000 (internal only) |
| `angio-web-1` | built from `client/` | static SPA behind Caddy, port 80 (internal only) |
| `angio-mongo-1` | `mongo:7` | database, volume `angio_mongo-data`, **never exposed to the internet** |
| `edge-caddy` | `lucaslorentz/caddy-docker-proxy:alpine` | TLS termination + routing, volume `proxy_caddy-data` |

**Routing is label-driven, not file-driven.** `edge-caddy` watches the Docker socket and builds its own config from labels on the app containers. There is no Caddyfile to edit. A container joins the external `edge` network and declares:

```yaml
labels:
  caddy: <APP_DOMAIN>
  caddy.reverse_proxy: "{{upstreams 80}}"
```

Certificates are issued automatically by Let's Encrypt on first request. This requires the DNS record to resolve directly to the VPS — if you use Cloudflare, the record must be **DNS-only (grey cloud)**, not proxied, or issuance fails.

Everyday commands (as `envirom`, from `/home/envirom/angio`):

```bash
docker compose ps                      # what's running
docker compose logs -f server          # tail API logs
docker compose up -d --build           # rebuild + roll forward after a code change
docker compose restart server          # restart without rebuilding
docker compose down                    # stop everything (volumes survive)
```

---

## 3. Cutover steps

Run in this order. Steps 1–3 need the previous host; the developer performs those.

**1. Freeze.** Stop `server` and `web` on the previous host. Mongo stays up for the dump. Any write after this point is lost, so the app must be down — not merely idle — for the whole window.

**2. Snapshot what's already on your box** (cheap insurance, keep the file):

```bash
docker exec angio-mongo-1 mongodump --archive --gzip --db angio > ~/angio-preexisting-$(date +%F).archive.gz
```

**3. Load live data.** The developer produces `angio-live.archive.gz` from the previous host. Copy it to your VPS, then:

```bash
docker exec -i angio-mongo-1 mongorestore --drop --archive --gzip < angio-live.archive.gz
```

`--drop` replaces the stale collections. Verify against the table in §1 before continuing:

```bash
docker exec angio-mongo-1 mongosh --quiet angio \
  --eval 'db.getCollectionNames().sort().forEach(c=>print(c, db[c].countDocuments()))'
```

**4. Bring the code current** (as `envirom` — running git as `root` here trips Git's `dubious ownership` guard):

```bash
cd /home/envirom/angio
git pull origin main
```

The 8 missing commits are user-visible: OTP removed from login (email/phone + password only), "My Plants" volunteer page, planting-photo upload, CO₂ reported in tonnes, geo-tracked maintenance logs.

**5. Apply your domain and credentials** — see §4. Do this *before* rebuilding; the API URL is compiled into the web bundle.

**6. Rebuild and start:**

```bash
docker compose up -d --build --remove-orphans
```

On 1 vCPU with no swap the Vite client build is the memory-heavy step. It has succeeded on this box before, but if it is killed, build one service at a time (`docker compose build server`, then `docker compose build web`).

**7. Point DNS.** `A` records for `<API_DOMAIN>` and `<APP_DOMAIN>` → `200.141.1.169`, DNS-only/grey if on Cloudflare. Wait for propagation, then load `https://<APP_DOMAIN>` — Caddy issues certificates on the first request.

**8. Verify** (§7) before telling anyone the migration is done.

---

## 4. Configuration to change

### `docker-compose.yml` (tracked in git — commit this change)

| Line | Now | Change to |
|---|---|---|
| ~46 | `caddy: <developer domain>` (server) | `caddy: <API_DOMAIN>` |
| ~59 | `VITE_API_BASE_URL: https://<developer domain>` | `VITE_API_BASE_URL: https://<API_DOMAIN>` |
| ~64 | `caddy: <developer domain>` (web) | `caddy: <APP_DOMAIN>` |

`VITE_API_BASE_URL` is a **build argument**, not a runtime variable — `client/Dockerfile` writes it into `.env.production` during the image build. Changing it and restarting does nothing; the web image must be rebuilt (`--build`), or the app keeps calling the old API host.

Also update `client/.env.production` and `server/.env.production.example` in the repo — both still carry the developer's domain as their example value.

### `server/.env` (not in git — edit directly on the VPS)

| Key | Action |
|---|---|
| `CLIENT_ORIGIN` | `https://<APP_DOMAIN>` |
| `PUBLIC_URL` | `https://<API_DOMAIN>` |
| `PRIMARY_NGO_ADMIN_EMAIL` | `<ADMIN_EMAIL>` — currently the developer's domain |
| `PRIMARY_NGO_ADMIN_PASSWORD` | new value; forced change on first login |
| `MAIL_FROM_EMAIL` | `<MAIL_FROM_EMAIL>` on your domain |
| `RESEND_API_KEY` | your account's key |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | your account's — see §5 |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | your account's live keys — see §6 |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **regenerate** (`openssl rand -hex 32`) — the current values are shared with the developer's environment. Regenerating logs everyone out once; that is the intended effect. |
| `COOKIE_SECURE` / `COOKIE_SAMESITE` | leave `true` / `none` — the app and API are on different subdomains |
| `MONGODB_URI` | ignore — `docker-compose.yml` sets it to the internal container and always wins |

Keep a backup before editing: `cp server/.env server/.env.bak`. (One stray `server/.env.bak.1784921544` from a previous session is already sitting in that directory — safe to delete.)

---

## 5. Cloudinary — read this before cutover

Photos are **not** stored in MongoDB. Mongo stores Cloudinary URLs; the image bytes live in a Cloudinary account.

**69 existing assets** — 63 on plants, 3 on maintenance logs, 2 on sites, 1 user avatar — live in the **developer's** Cloudinary account, and the restored records point at it. That account is not being transferred.

Choose one before go-live:

1. **Migrate the assets (recommended).** Download the 69 assets, re-upload to your Cloudinary account under the same `angio` folder, then rewrite the stored URLs in `plants`, `maintenanceLogs`, `sites`, `users`. A one-off script; needs both accounts' credentials, so it must run while the developer's account is still reachable.
2. **Accept the loss.** Existing photos break when the developer's account is closed. New uploads work normally. Records keep their (dead) URLs unless cleared.

Doing nothing is option 2 with a delay. New uploads go to whichever account is configured in `server/.env`, so uploads are safe either way — only the 69 historical images are at risk.

---

## 6. Razorpay

`RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` are currently identical on both hosts — confirm the account is yours, not the developer's, since donations settle into whichever account these keys belong to. If it is the developer's, swap in your own keys.

After cutover, update the webhook URL in the Razorpay dashboard to point at `https://<API_DOMAIN>` — payments will still be taken but confirmations will silently stop arriving otherwise.

---

## 7. Verification checklist

Run against `https://<APP_DOMAIN>` after DNS resolves. All eight must pass:

- [ ] Certificate valid and issued for `<APP_DOMAIN>` (and `<API_DOMAIN>`)
- [ ] Log in with a known account (no OTP step — expected after the update)
- [ ] Plant list shows **112** plants
- [ ] A plant photo loads (Cloudinary path — see §5)
- [ ] Opening a QR tree link `https://<APP_DOMAIN>/tree/{publicCode}` resolves
- [ ] Creating a maintenance log succeeds and records geo data (write path)
- [ ] A test donation completes and the Razorpay webhook is received
- [ ] `docker compose logs server` shows no repeating errors after 5 minutes

**Printed QR codes:** QR codes encode `${CLIENT_ORIGIN}/tree/{publicCode}`. Any tag printed before this migration points at the developer's domain and will stop working when it is retired. If physical tags are already in the field, either keep the old domain redirecting to `<APP_DOMAIN>` for a transition period, or reprint. Establish now whether such tags exist — this is the most expensive thing to discover late.

---

## 8. Deploy pipeline (GitHub Actions)

`.github/workflows/deploy.yml` deploys on every push to `main`: run tests → SSH into the VPS → `cd ~/angio`, `git reset --hard origin/main`, `docker compose up -d --build`. Gitignored files such as `server/.env` are preserved.

The workflow file itself needs **no change** — `~/angio` resolves correctly for `envirom`. Only the repository's environment secrets change (Settings → Environments → `production`):

| Secret | Set to |
|---|---|
| `VPS_HOST` | `200.141.1.169` |
| `VPS_USER` | `envirom` |
| `VPS_SSH_KEY` | private key of a keypair whose public half is in `/home/envirom/.ssh/authorized_keys` |

Confirm the `production` environment still restricts deployments to the `main` branch.

**Rotate the deploy key.** `/home/envirom/.ssh/authorized_keys` currently trusts the developer's `github-deploy` key and a personal laptop key. Until they are removed, the developer retains push-to-production and shell access to your server:

```bash
ssh-keygen -t ed25519 -C "angio-deploy" -f ~/.ssh/angio_deploy -N ""
# append angio_deploy.pub to /home/envirom/.ssh/authorized_keys
# put the private key in the VPS_SSH_KEY secret
# then remove the old keys from authorized_keys
```

Trigger the workflow manually once (Actions → Deploy → Run workflow) and confirm it goes green before trusting the next push.

---

## 9. Known gaps — your first tasks after cutover

- **No backups exist.** Nothing dumps Mongo on a schedule, on either host. Add a nightly `mongodump` to cron with off-box retention before the app carries real data.
- **No swap on a 1 vCPU / 3.8 GB box.** Builds are the pressure point. Adding a 2 GB swapfile is cheap insurance.
- **No monitoring or alerting.** If the site goes down, nothing tells you.
- **Root SSH is enabled with key auth.** Consider disabling root login once `envirom` covers everything you need.
- **69 Cloudinary assets** pending the §5 decision.
- **Printed QR codes** pending the §7 decision.

---

## 10. What the developer removes on their side

Kept here so both sides can confirm the separation is complete:

- Angio containers, images, and the `angio_mongo-data` volume on the previous host — **only after §7 passes**
- Their DNS records for the Angio subdomains (never repointed at the client VPS)
- Their SSH keys from `/home/envirom/.ssh/authorized_keys` on the client VPS (after §8's rotation)
- Their credentials removed from the shipped configuration — Cloudinary, Resend, and JWT secrets are regenerated by the client, not inherited

Secrets are never sent in this document or alongside the data archive. Values travel separately, in a password-protected archive over a different channel.
