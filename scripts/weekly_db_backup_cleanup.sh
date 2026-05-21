#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-/var/sbay/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-/var/sbay/db-backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-28}"
REFRESH_TOKEN_RETENTION_DAYS="${REFRESH_TOKEN_RETENTION_DAYS:-30}"
NOTIFICATION_RETENTION_DAYS="${NOTIFICATION_RETENTION_DAYS:-90}"
EMAIL_VERIFICATION_TOKEN_RETENTION_DAYS="${EMAIL_VERIFICATION_TOKEN_RETENTION_DAYS:-7}"
DEACTIVATED_ACCOUNT_RETENTION_DAYS="${DEACTIVATED_ACCOUNT_RETENTION_DAYS:-90}"
DELETED_LISTING_RETENTION_DAYS="${DELETED_LISTING_RETENTION_DAYS:-90}"
SOLD_LISTING_RETENTION_DAYS="${SOLD_LISTING_RETENTION_DAYS:-180}"
UNUSED_IMAGE_RETENTION_DAYS="${UNUSED_IMAGE_RETENTION_DAYS:-7}"
UPLOADS_PATH="${UPLOADS_PATH:-${UPLOADS_HOST_PATH:-/var/sbay/uploads}}"
DELETE_UPLOAD_FILES="${DELETE_UPLOAD_FILES:-false}"
CLEANUP_UNUSED_UPLOADS_CONFIRM="${CLEANUP_UNUSED_UPLOADS_CONFIRM:-}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${DB_USER:-sbay}"
DB_NAME="${DB_NAME:-sbay}"

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

mkdir -p "$BACKUP_DIR"

DATE="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/sbay_weekly_db_$DATE.sql.gz"

echo "Starting weekly database backup and cleanup."
echo "Project: $PROJECT_DIR"
echo "Compose file: $COMPOSE_FILE"
echo "Backup file: $BACKUP_FILE"

$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d "$DB_SERVICE"

echo "Waiting for database readiness..."
for i in $(seq 1 30); do
  if $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
    pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" = "30" ]; then
    echo "Database did not become ready."
    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps "$DB_SERVICE" || true
    $COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=120 "$DB_SERVICE" || true
    exit 1
  fi
  sleep 2
done

echo "Creating compressed database backup..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists | gzip -9 > "$BACKUP_FILE"

gzip -t "$BACKUP_FILE"
ls -lh "$BACKUP_FILE"

echo "Cleaning expired database rows..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  -v refresh_token_days="$REFRESH_TOKEN_RETENTION_DAYS" \
  -v notification_days="$NOTIFICATION_RETENTION_DAYS" \
  -v email_verification_token_days="$EMAIL_VERIFICATION_TOKEN_RETENTION_DAYS" \
  -v deactivated_account_days="$DEACTIVATED_ACCOUNT_RETENTION_DAYS" \
  -v deleted_listing_days="$DELETED_LISTING_RETENTION_DAYS" \
  -v sold_listing_days="$SOLD_LISTING_RETENTION_DAYS" <<'SQL'
BEGIN;

CREATE TEMP TABLE cleanup_account_ids AS
SELECT id
FROM users
WHERE status = 'deactivated'
  AND deactivated_at IS NOT NULL
  AND deactivated_at < now() - (:deactivated_account_days * interval '1 day');

CREATE TEMP TABLE cleanup_listing_ids AS
SELECT id
FROM listings
WHERE (
        status = 'deleted'
        AND COALESCE(updated_at, created_at) < now() - (:deleted_listing_days * interval '1 day')
      )
   OR (
        status = 'sold'
        AND COALESCE(sold_until, updated_at, created_at) < now() - (:sold_listing_days * interval '1 day')
      )
   OR seller_id IN (SELECT id FROM cleanup_account_ids);

CREATE TEMP TABLE cleanup_chat_ids AS
SELECT id
FROM chats
WHERE listing_id IN (SELECT id FROM cleanup_listing_ids)
   OR buyer_id IN (SELECT id FROM cleanup_account_ids)
   OR seller_id IN (SELECT id FROM cleanup_account_ids);

CREATE TEMP TABLE cleanup_counts (
  label TEXT PRIMARY KEY,
  affected_rows BIGINT NOT NULL
);

WITH affected AS (
  UPDATE users
  SET email_verification_token_hash = NULL,
      email_verification_expires_at = NULL
  WHERE email_verification_token_hash IS NOT NULL
    AND (
      email_verified = TRUE
      OR email_verification_expires_at IS NULL
      OR email_verification_expires_at < now() - (:email_verification_token_days * interval '1 day')
    )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'cleared_email_hashes', count(*) FROM affected;

WITH affected AS (
  DELETE FROM refresh_tokens
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
     OR (revoked_at IS NOT NULL AND revoked_at < now() - (:refresh_token_days * interval '1 day'))
     OR (expires_at < now() - (:refresh_token_days * interval '1 day'))
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_refresh_tokens', count(*) FROM affected;

WITH affected AS (
  DELETE FROM notifications
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
     OR (is_archived = TRUE AND created_at < now() - (:notification_days * interval '1 day'))
     OR (is_read = TRUE AND COALESCE(read_at, created_at) < now() - (:notification_days * interval '1 day'))
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_notifications', count(*) FROM affected;

WITH affected AS (
  DELETE FROM notification_preferences
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_notification_preferences', count(*) FROM affected;

WITH affected AS (
  DELETE FROM push_tokens
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_push_tokens', count(*) FROM affected;

WITH affected AS (
  DELETE FROM review_helpfuls
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
     OR review_id IN (
          SELECT id FROM reviews
          WHERE seller_id IN (SELECT id FROM cleanup_account_ids)
             OR reviewer_id IN (SELECT id FROM cleanup_account_ids)
             OR order_id IN (
                  SELECT id FROM orders
                  WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
                     OR seller_id IN (SELECT id FROM cleanup_account_ids)
             )
     )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_review_helpfuls', count(*) FROM affected;

WITH affected AS (
  DELETE FROM reviews
  WHERE seller_id IN (SELECT id FROM cleanup_account_ids)
     OR reviewer_id IN (SELECT id FROM cleanup_account_ids)
     OR order_id IN (
          SELECT id FROM orders
          WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
             OR seller_id IN (SELECT id FROM cleanup_account_ids)
     )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_reviews', count(*) FROM affected;

WITH affected AS (
  DELETE FROM platform_fees
  WHERE seller_id IN (SELECT id FROM cleanup_account_ids)
     OR order_id IN (
          SELECT id FROM orders
          WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
             OR seller_id IN (SELECT id FROM cleanup_account_ids)
     )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_platform_fees', count(*) FROM affected;

WITH affected AS (
  DELETE FROM listing_boost_purchases
  WHERE seller_id IN (SELECT id FROM cleanup_account_ids)
     OR listing_id IN (SELECT id FROM cleanup_listing_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_listing_boost_purchases', count(*) FROM affected;

WITH affected AS (
  DELETE FROM payment_transactions
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
     OR order_id IN (
          SELECT id FROM orders
          WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
             OR seller_id IN (SELECT id FROM cleanup_account_ids)
     )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_payment_transactions', count(*) FROM affected;

WITH affected AS (
  DELETE FROM order_items
  WHERE order_id IN (
          SELECT id FROM orders
          WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
             OR seller_id IN (SELECT id FROM cleanup_account_ids)
        )
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_order_items', count(*) FROM affected;

WITH affected AS (
  DELETE FROM orders
  WHERE buyer_id IN (SELECT id FROM cleanup_account_ids)
     OR seller_id IN (SELECT id FROM cleanup_account_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_orders', count(*) FROM affected;

WITH affected AS (
  DELETE FROM messages
  WHERE chat_id IN (SELECT id FROM cleanup_chat_ids)
     OR sender_id IN (SELECT id FROM cleanup_account_ids)
     OR receiver_id IN (SELECT id FROM cleanup_account_ids)
     OR listing_id IN (SELECT id FROM cleanup_listing_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_messages', count(*) FROM affected;

WITH affected AS (
  DELETE FROM chats
  WHERE id IN (SELECT id FROM cleanup_chat_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_chats', count(*) FROM affected;

WITH affected AS (
  DELETE FROM reports
  WHERE reporter_id IN (SELECT id FROM cleanup_account_ids)
     OR reported_user_id IN (SELECT id FROM cleanup_account_ids)
     OR reviewed_by_id IN (SELECT id FROM cleanup_account_ids)
     OR target_id IN (SELECT id FROM cleanup_account_ids)
     OR target_id IN (SELECT id FROM cleanup_listing_ids)
     OR target_id IN (SELECT id FROM cleanup_chat_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_reports', count(*) FROM affected;

WITH affected AS (
  DELETE FROM user_blocks
  WHERE blocker_id IN (SELECT id FROM cleanup_account_ids)
     OR blocked_user_id IN (SELECT id FROM cleanup_account_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_user_blocks', count(*) FROM affected;

WITH affected AS (
  DELETE FROM favorites
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
     OR listing_id IN (SELECT id FROM cleanup_listing_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_favorites', count(*) FROM affected;

WITH affected AS (
  DELETE FROM cart_items
  WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (SELECT id FROM cleanup_account_ids))
     OR listing_id IN (SELECT id FROM cleanup_listing_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_cart_items', count(*) FROM affected;

WITH affected AS (
  DELETE FROM carts
  WHERE user_id IN (SELECT id FROM cleanup_account_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_carts', count(*) FROM affected;

WITH affected AS (
  DELETE FROM listing_images
  WHERE listing_id IN (SELECT id FROM cleanup_listing_ids)
     OR NOT EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_images.listing_id)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_listing_images', count(*) FROM affected;

WITH affected AS (
  DELETE FROM listings
  WHERE id IN (SELECT id FROM cleanup_listing_ids)
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_listings', count(*) FROM affected;

WITH affected AS (
  DELETE FROM users
  WHERE id IN (SELECT id FROM cleanup_account_ids)
    AND status = 'deactivated'
  RETURNING 1
)
INSERT INTO cleanup_counts SELECT 'deleted_users', count(*) FROM affected;

SELECT label, affected_rows
FROM cleanup_counts
ORDER BY label;

COMMIT;
SQL

if [ "$DELETE_UPLOAD_FILES" = "true" ]; then
  echo "Cleaning unreferenced upload files with guarded cleanup script..."
  DELETE_UNUSED_UPLOADS=true \
    CLEANUP_UNUSED_UPLOADS_CONFIRM="$CLEANUP_UNUSED_UPLOADS_CONFIRM" \
    PROJECT_DIR="$PROJECT_DIR" \
    COMPOSE_FILE="$COMPOSE_FILE" \
    ENV_FILE="$ENV_FILE" \
    UPLOADS_PATH="$UPLOADS_PATH" \
    UNUSED_IMAGE_RETENTION_DAYS="$UNUSED_IMAGE_RETENTION_DAYS" \
    DB_SERVICE="$DB_SERVICE" \
    DB_USER="$DB_USER" \
    DB_NAME="$DB_NAME" \
    bash scripts/cleanup_unused_uploads.sh --delete
else
  echo "Upload file deletion disabled, running dry-run unused upload scan."
  DELETE_UNUSED_UPLOADS=false \
    PROJECT_DIR="$PROJECT_DIR" \
    COMPOSE_FILE="$COMPOSE_FILE" \
    ENV_FILE="$ENV_FILE" \
    UPLOADS_PATH="$UPLOADS_PATH" \
    UNUSED_IMAGE_RETENTION_DAYS="$UNUSED_IMAGE_RETENTION_DAYS" \
    DB_SERVICE="$DB_SERVICE" \
    DB_USER="$DB_USER" \
    DB_NAME="$DB_NAME" \
    bash scripts/cleanup_unused_uploads.sh --dry-run
fi

echo "Running VACUUM ANALYZE..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (ANALYZE);"

echo "Removing old weekly database backups..."
find "$BACKUP_DIR" -name 'sbay_weekly_db_*.sql.gz' -mtime +"$BACKUP_RETENTION_DAYS" -print -delete

echo "Weekly database backup and cleanup complete."
du -sh "$BACKUP_DIR"
