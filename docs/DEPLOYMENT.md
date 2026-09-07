# Deployment Runbook — VPS + Docker

## Architecture

```
Client app (capacitor://localhost) ──────────────────────────────────────────┐
                                                                              │
Browser SPA (https://app.environfoundationindia.org) → web:80 (Docker, Caddy static)   │
                                                                              │
                        Edge Caddy :443 auto-TLS                             │
                        api.environfoundationindia.org  → server:4000                       │
                        app.environfoundationindia.org → web:80                         │
                            ▼                                                 │
                    server:4000 (Docker) → mongo:27017 (internal only)      ◄┘
```

Four containers on one network (`internal`): `caddy`, `server`, `mongo`, `web`. Mongo is never reachable from outside the host.

---

## Prerequisites

- Ubuntu VPS with ports **80** and **443** open
- Docker + Compose:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER   # re-login after this
  ```
- UFW firewall rules:
  ```bash
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow OpenSSH
  sudo ufw enable
  ```

---

## DNS

Add **two** `A` records in your DNS registrar:

| Name | Type | Value | Purpose |
|------|------|-------|---------|
| `api` | A | `<VPS_IP>` | API server |
| `environ` | A | `<VPS_IP>` | Web SPA (serves QR scan links) |

Set both to **DNS-only / grey-cloud** (no proxy). Caddy uses the Let's Encrypt HTTP-01 challenge — it needs a direct TCP connection from ACME servers to port 80. A CDN proxy intercepts that connection and TLS issuance fails.

Update `deploy/Caddyfile` to match your actual domain before deploying.

---

## Get the code onto the VPS

```bash
# clone directly on the VPS
git clone <repo-url> ~/angio
cd ~/angio
```

> **Note:** `docker-compose.yml` is on `main`. The workflow deploys from `main`.

---

## Secrets

```bash
cd ~/angio
cp server/.env.production.example server/.env
```

Open `server/.env` and fill in:

| Key | How to get it |
|-----|--------------|
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (different value) |
| `CLIENT_ORIGIN` | `https://app.environfoundationindia.org` (the web SPA subdomain) |
| `PUBLIC_URL` | `https://api.environfoundationindia.org` |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `none` (required for cross-subdomain cookies: `environ` → `api`) |
| `CLOUDINARY_*` | Cloudinary dashboard → Settings → Access Keys |
| `RESEND_API_KEY` | Resend dashboard (preferred), **or** fill `MAIL_*` for SMTP |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay dashboard (use live keys in prod) |
| `RAZORPAY_WEBHOOK_SECRET` | `openssl rand -hex 32` — set the **same value** in the Razorpay dashboard webhook config |
| `PRIMARY_NGO_ADMIN_EMAIL` / `PASSWORD` / `NAME` | Seed values; user is forced to change password on first login |

> **Do not set `MONGODB_URI`** — `docker-compose.yml` injects `mongodb://mongo:27017/angio` and overrides any value in `.env`.

---

## Web client

The `web` service in `docker-compose.yml` builds the React SPA via a multi-stage `client/Dockerfile`:

1. **Build stage** — `node:22-alpine` runs `npm run build` (Vite). `VITE_API_BASE_URL` is passed as a build `ARG` and baked into the bundle.
2. **Serve stage** — `caddy:2-alpine` serves `/srv` with SPA fallback (`try_files {path} /index.html`) and gzip. Listens on port 80 internally.

The edge Caddy reverse-proxies `app.environfoundationindia.org` → `web:80` with auto-TLS.

**Why this matters:** QR codes encode `${CLIENT_ORIGIN}/tree/{publicCode}`. With the web client hosted at `app.environfoundationindia.org`, scanning a QR code opens the public tree page in the browser without needing the native app installed.

Set `VITE_API_BASE_URL` in the `web` service's build args in `docker-compose.yml`:

```yaml
web:
  build:
    context: ./client
    args:
      VITE_API_BASE_URL: https://api.environfoundationindia.org
```

---

## Launch

```bash
cd ~/angio
docker compose up -d --build
```

Caddy auto-provisions TLS certs on first request. Verify both services:

```bash
curl https://api.environfoundationindia.org/api/health
# → {"status":"ok"}

curl -I https://app.environfoundationindia.org
# → HTTP/2 200
```

Tail logs:

```bash
docker compose logs -f server
docker compose logs -f caddy
docker compose logs -f web
```

---

## CI/CD (auto-deploy)

Every push to `main` triggers `.github/workflows/deploy.yml`:

1. **`test` job** — installs deps, runs server regression tests (`npm test`), and does a full client Vite build to catch compile errors.
2. **`deploy` job** — only runs if `test` passes and `github.ref == 'refs/heads/main'`. SSHes into the VPS (via `appleboy/ssh-action`) and runs:
   ```bash
   git fetch origin main && git checkout main
   git reset --hard origin/main
   docker compose up -d --build
   docker image prune -f
   ```

**Required GitHub repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `VPS_HOST` | IP or hostname of the VPS (`<VPS_IP>`) |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Private key of a dedicated deploy keypair (PEM, no passphrase) |

**Deploy key setup (one-time):**

```bash
# On your local machine — generate a dedicated keypair
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/angio_deploy -N ""

# Copy the public key to the VPS
ssh-copy-id -i ~/.ssh/angio_deploy.pub <VPS_USER>@<VPS_IP>

# Add the PRIVATE key (angio_deploy) as the VPS_SSH_KEY repo secret
```

**Production environment branch policy (recommended):** in GitHub → repo Settings → Environments → `production`, set the deployment branch to `main`. This prevents the `VPS_*` secrets from being used in workflows triggered by any other ref, regardless of workflow file contents.

> Pushing to `main` now auto-deploys. Manual deploys via `docker compose up -d --build` on the VPS still work.

---

## Manual update (without CI/CD)

```bash
cd ~/angio
./deploy.sh
```

`deploy.sh` runs `git pull --ff-only && docker compose up -d --build` and prints final container status. Mongo and Caddy data persist on named volumes across rebuilds.

Server-only rebuild:

```bash
docker compose up -d --build server
```

---

## Gotchas

| Issue | Fix |
|-------|-----|
| TLS cert never issues | DNS A records must be DNS-only (no CDN proxy); ports 80 + 443 must be open in UFW. |
| CORS errors from web client | `CLIENT_ORIGIN` in `server/.env` must be `https://app.environfoundationindia.org` — exact origin, no trailing slash. |
| QR scan links go nowhere | `CLIENT_ORIGIN` must be set to the hosted web-client URL — QR codes encode `${CLIENT_ORIGIN}/tree/{publicCode}`. |
| Cookies not sent from browser | Set `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` for HTTPS cross-subdomain. |
| Native app can't reach API | Ensure `VITE_API_BASE_URL` build arg in `docker-compose.yml` is set to `https://api.environfoundationindia.org`. |
| CI deploy fails auth | The public half of `VPS_SSH_KEY` must be in `~/.ssh/authorized_keys` on the VPS for the deploy user. |
| Old code after CI deploy | Verify `git log --oneline -3` on the VPS matches the expected commits. |

---

## Reference files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service definitions (caddy, server, mongo, web), named volumes, internal network |
| `server/Dockerfile` | Node 20 Alpine image; only prod deps (`npm ci --omit=dev`) |
| `client/Dockerfile` | Multi-stage: Node 22 Vite build → Caddy static serve with SPA fallback |
| `deploy/Caddyfile` | Edge Caddy config — two virtual hosts (`api` + `environ`); update domain before deploying |
| `deploy.sh` | One-command manual update (`git pull` + `docker compose up -d --build`) |
| `.github/workflows/deploy.yml` | CI/CD pipeline — tests + SSH deploy on push to main |
| `server/.env.production.example` | All server env vars with inline docs |
