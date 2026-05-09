#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/opt/sbay"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

cd "$PROJECT_DIR"
set -a
source "$ENV_FILE"
set +a

echo "SBay IONOS VPS health check"
echo

echo "Disk usage"
df -h /
echo

echo "Docker services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
echo

echo "Uploads volume"
docker run --rm -v sbay_uploads:/uploads:ro alpine:3.20 du -sh /uploads 2>/dev/null || true
echo

echo "Database size"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  psql -U sbay -d sbay -c "SELECT pg_size_pretty(pg_database_size('sbay')) AS db_size;" || true
echo

echo "HTTP checks"
curl -sS -o /dev/null -w "Frontend: %{http_code}\n" "https://${DOMAIN_NAME}/" || true
curl -sS -o /dev/null -w "API ready: %{http_code}\n" "https://${DOMAIN_NAME}/health/ready" || true
echo

echo "Recent backups"
ls -lah "$PROJECT_DIR/backups" 2>/dev/null | tail -10 || true
