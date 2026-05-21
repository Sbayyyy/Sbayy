#!/usr/bin/env bash
set -euo pipefail

# Gradually removes first-time seed bot content from the platform.
# This script is intentionally not exposed through the API.
#
# Connection:
#   DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/retire_seed_bots.sh
#   or use normal PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD env vars.
#
# Schedule:
#   Run weekly from cron/Jenkins after seeding. It will retire an increasing
#   fraction of seed-bot listings across RETIRE_DAYS, then deactivate bot sellers.
#
# Required:
#   RETIRE_START_DATE=YYYY-MM-DD
#
# Optional:
#   RETIRE_DAYS=90
#   RETIRE_MODE=deleted|hidden
#   DRY_RUN=true
#   RETIRE_SEED_BOTS_CONFIRM=retire-seed-bots

SCRIPT_NAME="$(basename "$0")"
RETIRE_START_DATE="${RETIRE_START_DATE:-}"
RETIRE_DAYS="${RETIRE_DAYS:-90}"
RETIRE_MODE="${RETIRE_MODE:-deleted}"
DRY_RUN="${DRY_RUN:-false}"
RETIRE_SEED_BOTS_CONFIRM="${RETIRE_SEED_BOTS_CONFIRM:-}"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql is required but was not found in PATH." >&2
  exit 1
fi

if ! [[ "$RETIRE_DAYS" =~ ^[0-9]+$ ]] || [ "$RETIRE_DAYS" -lt 1 ]; then
  echo "error: RETIRE_DAYS must be a positive integer." >&2
  exit 1
fi

if [ "$RETIRE_MODE" != "hidden" ] && [ "$RETIRE_MODE" != "deleted" ]; then
  echo "error: RETIRE_MODE must be hidden or deleted." >&2
  exit 1
fi

if [ "$DRY_RUN" != "true" ] && [ "$DRY_RUN" != "false" ]; then
  echo "error: DRY_RUN must be true or false." >&2
  exit 1
fi

if ! [[ "$RETIRE_START_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "error: RETIRE_START_DATE=YYYY-MM-DD is required." >&2
  exit 1
fi

if [ "$DRY_RUN" != "true" ] && [ "$RETIRE_SEED_BOTS_CONFIRM" != "retire-seed-bots" ]; then
  echo "error: set RETIRE_SEED_BOTS_CONFIRM=retire-seed-bots to modify seed bot data." >&2
  exit 1
fi

SQL_FILE="$(mktemp -t sbay-retire-seed-bots.XXXXXX)"
cleanup() {
  rm -f "$SQL_FILE"
}
trap cleanup EXIT

cat >"$SQL_FILE" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE retire_options (
  start_date date NOT NULL,
  retire_days int NOT NULL,
  retire_mode text NOT NULL
) ON COMMIT DROP;

INSERT INTO retire_options VALUES (:'retire_start_date'::date, :'retire_days'::int, :'retire_mode');

CREATE TEMP TABLE retire_plan AS
WITH options AS (
  SELECT
    start_date,
    retire_days,
    retire_mode,
    greatest(0, current_date - start_date) AS elapsed_days
  FROM retire_options
),
seed_listings AS (
  SELECT
    l.id,
    l.status,
    row_number() over (order by l.created_at, l.id) AS retire_order,
    count(*) over () AS total_count
  FROM listings l
  JOIN users u ON u.id = l.seller_id
  WHERE u.external_id LIKE 'seed-bot:%'
),
target AS (
  SELECT
    s.*,
    o.retire_mode,
    least(1.0, o.elapsed_days::numeric / o.retire_days::numeric) AS progress,
    ceiling(s.total_count * least(1.0, o.elapsed_days::numeric / o.retire_days::numeric))::int AS target_count
  FROM seed_listings s
  CROSS JOIN options o
)
SELECT
  id,
  status,
  retire_order,
  total_count,
  target_count,
  progress,
  retire_mode
FROM target
WHERE retire_order <= target_count;

UPDATE listings l
SET status = p.retire_mode,
    updated_at = now()
FROM retire_plan p
WHERE p.id = l.id
  AND l.status = 'active';

WITH options AS (
  SELECT
    current_date >= start_date + retire_days AS complete
  FROM retire_options
)
UPDATE users u
SET status = 'deactivated',
    deactivated_at = COALESCE(u.deactivated_at, now())
FROM options o
WHERE o.complete
  AND u.external_id LIKE 'seed-bot:%'
  AND u.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM listings l
    WHERE l.seller_id = u.id
      AND l.status = 'active'
  );

SELECT
  (SELECT start_date FROM retire_options) AS retire_start_date,
  (SELECT retire_days FROM retire_options) AS retire_days,
  (SELECT retire_mode FROM retire_options) AS retire_mode,
  (SELECT count(*) FROM listings l JOIN users u ON u.id = l.seller_id WHERE u.external_id LIKE 'seed-bot:%') AS seed_bot_listings_total,
  (SELECT count(*) FROM listings l JOIN users u ON u.id = l.seller_id WHERE u.external_id LIKE 'seed-bot:%' AND l.status = 'active') AS seed_bot_listings_active,
  (SELECT count(*) FROM retire_plan) AS seed_bot_listings_due_retired,
  (SELECT count(*) FROM users WHERE external_id LIKE 'seed-bot:%' AND status = 'active') AS seed_bot_sellers_active;

\if :dry_run
ROLLBACK;
\else
COMMIT;
\endif
SQL

PSQL_ARGS=(
  -v "retire_start_date=${RETIRE_START_DATE}"
  -v "retire_days=${RETIRE_DAYS}"
  -v "retire_mode=${RETIRE_MODE}"
  -v "dry_run=${DRY_RUN}"
  -f "$SQL_FILE"
)

echo "Running ${SCRIPT_NAME} (dry_run=${DRY_RUN}, start=${RETIRE_START_DATE}, days=${RETIRE_DAYS}, mode=${RETIRE_MODE})"
if [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" "${PSQL_ARGS[@]}"
else
  psql "${PSQL_ARGS[@]}"
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "Dry run complete. No seed bot data was changed."
else
  echo "Retirement step complete."
fi
