#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-${HOME}/apps/sbay/Sbayy}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-/var/sbay/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/sbay/backups}"
DATE="$(date +%Y%m%d_%H%M%S)"
NAME="sbay_backup_$DATE"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Docker Compose is not available."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

echo "Starting SBay backup: $NAME"

$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U sbay -d sbay | gzip > "$BACKUP_DIR/${NAME}_db.sql.gz"

UPLOADS_PATH="${UPLOADS_HOST_PATH:-$PROJECT_DIR/uploads}"
if [ -d "$UPLOADS_PATH" ]; then
  tar -czf "$BACKUP_DIR/${NAME}_uploads.tar.gz" -C "$UPLOADS_PATH" .
fi

$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T redis \
  redis-cli SAVE >/dev/null || true

REDIS_VOLUME="sbay_redisdata"
if docker volume inspect "$REDIS_VOLUME" >/dev/null 2>&1; then
  docker run --rm \
    -v "$REDIS_VOLUME":/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine:3.20 \
    sh -c "if [ -f /data/dump.rdb ]; then cp /data/dump.rdb /backup/${NAME}_redis.rdb; fi"
fi

find "$BACKUP_DIR" -name "sbay_backup_*" -mtime +14 -delete

echo "Backup complete: $BACKUP_DIR"
du -sh "$BACKUP_DIR"
