#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-/var/sbay/.env.production}"
UPLOADS_PATH="${UPLOADS_PATH:-${UPLOADS_HOST_PATH:-/var/sbay/uploads}}"
UNUSED_IMAGE_RETENTION_DAYS="${UNUSED_IMAGE_RETENTION_DAYS:-7}"
DELETE_UNUSED_UPLOADS="${DELETE_UNUSED_UPLOADS:-false}"
CLEANUP_UNUSED_UPLOADS_CONFIRM="${CLEANUP_UNUSED_UPLOADS_CONFIRM:-}"
DB_SERVICE="${DB_SERVICE:-postgres}"
DB_USER="${DB_USER:-sbay}"
DB_NAME="${DB_NAME:-sbay}"

usage() {
  cat <<'EOF'
Usage: cleanup_unused_uploads.sh [--delete]

Safely scans the local uploads directory for old image files that are not
referenced by the database. The default mode is dry-run.

Real deletion requires both:
  --delete or DELETE_UNUSED_UPLOADS=true
  CLEANUP_UNUSED_UPLOADS_CONFIRM=delete-unused-uploads

Expected environment:
  ENV_FILE=/var/sbay/.env.production
  COMPOSE_FILE=docker-compose.prod.yml
  UPLOADS_PATH=/var/sbay/uploads
  UNUSED_IMAGE_RETENTION_DAYS=7
EOF
}

for arg in "$@"; do
  case "$arg" in
    --delete)
      DELETE_UNUSED_UPLOADS=true
      ;;
    --dry-run)
      DELETE_UNUSED_UPLOADS=false
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg"
      usage
      exit 2
      ;;
  esac
done

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

if ! [[ "$UNUSED_IMAGE_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "UNUSED_IMAGE_RETENTION_DAYS must be a whole number."
  exit 1
fi

if [ "$UNUSED_IMAGE_RETENTION_DAYS" -lt 7 ]; then
  echo "Refusing to use a retention window shorter than 7 days."
  exit 1
fi

if [ ! -d "$UPLOADS_PATH" ]; then
  echo "Uploads path does not exist, skipping: $UPLOADS_PATH"
  exit 0
fi

UPLOADS_ROOT="$(cd "$UPLOADS_PATH" && pwd -P)"
if [ "$UPLOADS_ROOT" = "/" ] || [ "$UPLOADS_ROOT" = "/var" ] || [ "$UPLOADS_ROOT" = "/var/sbay" ]; then
  echo "Refusing unsafe uploads root: $UPLOADS_ROOT"
  exit 1
fi

if [ "$(basename "$UPLOADS_ROOT")" != "uploads" ] && [ "${ALLOW_NONSTANDARD_UPLOADS_PATH:-false}" != "true" ]; then
  echo "Refusing nonstandard uploads root: $UPLOADS_ROOT"
  echo "Set ALLOW_NONSTANDARD_UPLOADS_PATH=true only after manually verifying this path."
  exit 1
fi

if [ -L "$UPLOADS_ROOT" ]; then
  echo "Refusing symlink uploads root: $UPLOADS_ROOT"
  exit 1
fi

delete_mode=false
if [ "$DELETE_UNUSED_UPLOADS" = "true" ]; then
  if [ "$CLEANUP_UNUSED_UPLOADS_CONFIRM" != "delete-unused-uploads" ]; then
    echo "Delete requested, but CLEANUP_UNUSED_UPLOADS_CONFIRM is not set to delete-unused-uploads."
    echo "Continuing in dry-run mode."
  else
    delete_mode=true
  fi
fi

REFERENCED_UPLOADS_FILE="$(mktemp)"
CANDIDATE_UPLOADS_FILE="$(mktemp)"
trap 'rm -f "$REFERENCED_UPLOADS_FILE" "$CANDIDATE_UPLOADS_FILE"' EXIT

echo "Loading referenced uploads from database..."
$COMPOSE_CMD --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T "$DB_SERVICE" \
  psql -v ON_ERROR_STOP=1 -At -U "$DB_USER" -d "$DB_NAME" <<'SQL' | sed 's/\r$//' \
  | awk 'NF && $0 !~ /\// && $0 !~ /\.\./ && $0 ~ /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/ { print $0 }' \
  | sort -u > "$REFERENCED_UPLOADS_FILE"
WITH refs(path) AS (
  SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL
  UNION ALL
  SELECT thumbnail_url FROM listings WHERE thumbnail_url IS NOT NULL
  UNION ALL
  SELECT url FROM listing_images WHERE url IS NOT NULL
  UNION ALL
  SELECT image_url FROM sponsored_ads WHERE image_url IS NOT NULL
  UNION ALL
  SELECT unnest(evidence_urls) FROM reports WHERE evidence_urls IS NOT NULL
)
SELECT DISTINCT regexp_replace(split_part(path, '/uploads/', 2), '[?#].*$', '')
FROM refs
WHERE position('/uploads/' in path) > 0
  AND regexp_replace(split_part(path, '/uploads/', 2), '[?#].*$', '') <> '';
SQL

echo "Scanning old image files in $UPLOADS_ROOT..."
find "$UPLOADS_ROOT" -maxdepth 1 -type f \
  \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.gif' \) \
  -mtime +"$UNUSED_IMAGE_RETENTION_DAYS" -printf '%f\n' \
  | awk '$0 !~ /\// && $0 !~ /\.\./ && $0 ~ /^[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/ { print $0 }' \
  | sort -u > "$CANDIDATE_UPLOADS_FILE"

candidate_count="$(wc -l < "$CANDIDATE_UPLOADS_FILE" | tr -d ' ')"
referenced_count="$(wc -l < "$REFERENCED_UPLOADS_FILE" | tr -d ' ')"
unused_count=0
deleted_count=0

echo "Referenced uploads: $referenced_count"
echo "Old upload candidates: $candidate_count"
echo "Mode: $([ "$delete_mode" = "true" ] && echo delete || echo dry-run)"

while IFS= read -r file_name; do
  [ -n "$file_name" ] || continue
  if grep -Fxq -- "$file_name" "$REFERENCED_UPLOADS_FILE"; then
    continue
  fi

  unused_count=$((unused_count + 1))
  full_path="$UPLOADS_ROOT/$file_name"
  safe_path="$(cd "$(dirname "$full_path")" && pwd -P)/$(basename "$full_path")"
  if [ "${safe_path#"$UPLOADS_ROOT"/}" = "$safe_path" ]; then
    echo "Skipping unsafe path outside uploads root: $full_path"
    continue
  fi

  if [ "$delete_mode" = "true" ]; then
    if [ -f "$safe_path" ] && [ ! -L "$safe_path" ]; then
      rm -f -- "$safe_path"
      deleted_count=$((deleted_count + 1))
      echo "Deleted unused upload: $file_name"
    fi
  else
    echo "Would delete unused upload: $file_name"
  fi
done < "$CANDIDATE_UPLOADS_FILE"

if [ "$delete_mode" = "true" ]; then
  find "$UPLOADS_ROOT" -mindepth 1 -type d -empty -delete
fi

echo "Unused upload files found: $unused_count"
echo "Unused upload files deleted: $deleted_count"
