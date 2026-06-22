#!/usr/bin/env bash
# One-command update for the Dockerized API on the VPS.
#   ./deploy.sh
# Pulls latest, rebuilds the server image, restarts the stack. Mongo +
# Caddy data persist on named volumes across restarts.
set -euo pipefail

cd "$(dirname "$0")"

echo "→ pulling latest…"
git pull --ff-only

echo "→ rebuilding + restarting…"
docker compose up -d --build

echo "→ status:"
docker compose ps

echo "✓ deployed. Tail logs with: docker compose logs -f server"
