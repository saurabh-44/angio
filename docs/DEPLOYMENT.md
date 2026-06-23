# Deployment Runbook — VPS + Docker

## Architecture

```
Client app / website → api.example.com (Caddy :443 auto-TLS) → server:4000 (Docker) → mongo:27017 (internal only, not exposed to host)
```

Three containers on one network (`internal`): `caddy`, `server`, `mongo`. Mongo is never reachable from outside the host.

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

Add an `A` record in your DNS registrar:

| Name | Type | Value |
|------|------|-------|
| `api` | A | `<VPS_IP>` |

Set it to **DNS-only / grey-cloud** (no proxy). Caddy uses the Let's Encrypt HTTP-01 challenge to issue TLS — it needs a direct TCP connection from ACME servers to port 80 on this machine. A CDN proxy in front intercepts that connection and TLS issuance fails.

Update `deploy/Caddyfile` to match your actual domain before deploying.

---

## Get the code onto the VPS

```bash
# Option A — public repo
git clone <repo-url> /opt/angio
cd /opt/angio
git checkout feat/mobile-capacitor-deploy
```

> **Important:** `docker-compose.yml` lives only on the `feat/mobile-capacitor-deploy` branch. The `main` branch does not have it.

```bash
# Option B — rsync from local machine
rsync -avz --exclude '.git' /local/path/angio/ user@<VPS_IP>:/opt/angio/
```

---

## Secrets

```bash
cd /opt/angio
cp server/.env.production.example server/.env
```

Open `server/.env` and fill in:

| Key | How to get it |
|-----|--------------|
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 48` (different value) |
| `CLIENT_ORIGIN` | URL of your hosted web client (e.g. `https://app.example.com`) |
| `PUBLIC_URL` | `https://api.example.com` |
| `CLOUDINARY_*` | Cloudinary dashboard → Settings → Access Keys |
| `RESEND_API_KEY` | Resend dashboard (preferred), **or** fill `MAIL_*` for SMTP |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay dashboard (use live keys in prod) |
| `PRIMARY_NGO_ADMIN_EMAIL` / `PASSWORD` / `NAME` | Seed values; user is forced to change password on first login |

> **Do not set `MONGODB_URI`** — `docker-compose.yml` injects `mongodb://mongo:27017/angio` and overrides any value in `.env`.

> **Cookie settings for HTTPS prod:** set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` so the hosted web client can send cookies cross-site to the api subdomain.

---

## Launch

```bash
cd /opt/angio
docker compose up -d --build
```

Caddy auto-provisions the TLS cert on first request (takes a few seconds). Verify:

```bash
curl https://api.example.com/api/health
# → {"status":"ok"}
```

Tail logs:

```bash
docker compose logs -f server
docker compose logs -f caddy
```

---

## Update flow

```bash
cd /opt/angio
./deploy.sh
```

`deploy.sh` runs `git pull --ff-only && docker compose up -d --build` and prints final container status. Mongo and Caddy data persist on named volumes across rebuilds.

Server-only rebuild (skip pulling a new image for mongo/caddy):

```bash
docker compose up -d --build server
```

---

## Gotchas

| Issue | Fix |
|-------|-----|
| `docker-compose.yml` not found | You're on `main`. Switch to `feat/mobile-capacitor-deploy`. |
| TLS cert never issues | DNS A record must be DNS-only (no CDN proxy); ports 80 + 443 must be open in UFW. |
| CORS errors from the web client | `CLIENT_ORIGIN` in `server/.env` must match the exact origin of the hosted web client (scheme + host, no trailing slash). See GitHub issue #10. |
| QR scan links go nowhere | `CLIENT_ORIGIN` (and therefore `PUBLIC_URL`) must be set to the hosted web-client URL — QR codes encode `${CLIENT_ORIGIN}/tree/{publicCode}`. Issue #10. |
| Cookies not sent from browser | Set `COOKIE_SECURE=true` + `COOKIE_SAMESITE=none` for HTTPS cross-site. |
| Native app can't reach API | Ensure `VITE_API_BASE_URL` in `client/.env.production` is set to `https://api.example.com` before `npm run build && npx cap sync`. |

---

## Reference files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service definitions (caddy, server, mongo), named volumes, internal network |
| `server/Dockerfile` | Node 20 Alpine image; only prod deps (`npm ci --omit=dev`) |
| `deploy/Caddyfile` | Caddy config — update the domain here before deploying |
| `deploy.sh` | One-command update script (`git pull` + `docker compose up -d --build`) |
| `server/.env.production.example` | All server env vars with inline docs |
