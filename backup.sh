#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="/opt/sbay"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE="$(date +%Y%m%d_%H%M%S)"
NAME="sbay_backup_$DATE"

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"

echo "Starting SBay backup: $NAME"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U sbay -d sbay | gzip > "$BACKUP_DIR/${NAME}_db.sql.gz"

docker run --rm \
  -v sbay_uploads:/uploads:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.20 \
  tar -czf "/backup/${NAME}_uploads.tar.gz" -C /uploads .

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T redis \
  redis-cli SAVE >/dev/null || true

docker run --rm \
  -v sbay_redisdata:/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine:3.20 \
  sh -c "if [ -f /data/dump.rdb ]; then cp /data/dump.rdb /backup/${NAME}_redis.rdb; fi"

find "$BACKUP_DIR" -name "sbay_backup_*" -mtime +7 -delete

echo "Backup complete: $BACKUP_DIR"
du -sh "$BACKUP_DIR"
