#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/opt/sbay"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

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
  echo "$ENV_FILE is missing. Copy .env.prod.example to .env.prod and set your IONOS domain and secrets."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [ -z "${DOMAIN_NAME:-}" ]; then
  echo "DOMAIN_NAME is required in $ENV_FILE."
  exit 1
fi

if [ ! -d "Backend" ] || [ ! -d "Frontend" ] || [ ! -d "Database" ] || [ ! -f "$COMPOSE_FILE" ] || [ ! -f "nginx.conf" ]; then
  echo "Project files are incomplete in $PROJECT_DIR."
  echo "Upload Backend, Frontend, Database, nginx.conf, $COMPOSE_FILE, and $ENV_FILE before running this script."
  exit 1
fi

if [ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ] || [ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" ]; then
  echo "No Let's Encrypt certificate found for $DOMAIN_NAME."
  echo "Stopping anything on ports 80/443, then requesting a certificate."
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down || true
  sudo certbot certonly --standalone -d "$DOMAIN_NAME" --agree-tos --register-unsafely-without-email --non-interactive
fi

echo "Validating Docker Compose configuration"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

echo "Building and starting SBay"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "Waiting for services"
sleep 20
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Checking health endpoints"
curl -fsS "https://$DOMAIN_NAME/health/live" >/dev/null
curl -fsS "https://$DOMAIN_NAME/health/ready" >/dev/null

echo "Deployment complete"
echo "Frontend: https://$DOMAIN_NAME"
echo "API: https://$DOMAIN_NAME/api"
echo "Uploads: https://$DOMAIN_NAME/uploads"
