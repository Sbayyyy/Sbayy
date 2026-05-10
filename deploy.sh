#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/opt/apps/sbay/Sbay"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo "Starting SBay deployment for IONOS VPS"

sudo apt update
sudo apt install -y ca-certificates curl gnupg certbot

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
  sudo usermod -aG docker "$USER" || true
fi

if ! docker compose version >/dev/null 2>&1; then
  sudo apt install -y docker-compose-plugin
fi

sudo mkdir -p "$PROJECT_DIR"
sudo chown "$USER:$USER" "$PROJECT_DIR"
cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "$ENV_FILE is missing. Copy .env.production.example to .env.production and set your IONOS domain and secrets."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${DOMAIN_NAME:-}" ]; then
  echo "DOMAIN_NAME is required in $ENV_FILE."
  exit 1
fi

mkdir -p "${UPLOADS_HOST_PATH:-/opt/apps/sbay/Sbay/uploads}"

if [ ! -d "Backend" ] || [ ! -d "Frontend" ] || [ ! -d "Database" ] || [ ! -f "$COMPOSE_FILE" ]; then
  echo "Project files are incomplete in $PROJECT_DIR."
  echo "Upload Backend, Frontend, Database, $COMPOSE_FILE, and $ENV_FILE before running this script."
  exit 1
fi

echo "Validating Docker Compose configuration"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

echo "Building and starting SBay"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Waiting for services"
sleep 20
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Checking health endpoints"
curl -fsS "http://127.0.0.1:${API_HOST_PORT:-5000}/health/ready" >/dev/null
curl -fsS "http://127.0.0.1:${WEB_HOST_PORT:-3000}/" >/dev/null

echo "Deployment complete"
echo "Frontend: ${FRONTEND_URL:-https://syrian-bay.com}"
echo "API: ${APP_PUBLIC_BASE_URL:-https://api.syrian-bay.com}"
echo "Uploads: ${STORAGE_LOCAL_PUBLIC_BASE_URL:-https://api.syrian-bay.com/uploads}"
