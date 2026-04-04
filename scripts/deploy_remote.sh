#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

mkdir -p data _ext_targets external_logs

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not installed on the VPS" >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "docker compose is not available on the VPS" >&2
  exit 1
fi

"${COMPOSE[@]}" -f docker-compose.yml -f docker-compose.deploy.yml up -d --build --remove-orphans
"${COMPOSE[@]}" -f docker-compose.yml -f docker-compose.deploy.yml ps
"${COMPOSE[@]}" -f docker-compose.yml -f docker-compose.deploy.yml logs --no-color --tail=60 app || true
