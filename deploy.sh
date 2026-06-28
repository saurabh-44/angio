#!/usr/bin/env bash
# One-command update for the Dockerized API on the VPS.
#   ./deploy.sh
# Pulls latest, rebuilds the server image, restarts the stack. Mongo data
# persists on a named volume. TLS is handled by the shared ~/proxy stack.
set -euo pipefail

cd "$(dirname "$0")"

echo "→ pulling latest…"
git pull --ff-only

echo "→ ensuring shared edge proxy network exists…"
docker network create edge 2>/dev/null || true

echo "→ rebuilding + restarting…"
docker compose up -d --build --remove-orphans

echo "→ status:"
docker compose ps

echo "✓ deployed. Tail logs with: docker compose logs -f server"
