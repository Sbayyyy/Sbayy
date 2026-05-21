#!/usr/bin/env bash
set -euo pipefail

# Seeds a new SBay platform with realistic bot sellers and listings.
# This script is intentionally not exposed through the API.
#
# Connection:
#   DATABASE_URL=postgres://user:pass@host:5432/db ./scripts/seed_platform_first_time.sh
#   or use normal PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD env vars.
#
# Safety:
#   - By default, refuses to seed when real listings or non-admin users already exist.
#   - Reruns are idempotent for seed-bot sellers/listings.
#   - Use ALLOW_NON_EMPTY_SEED=true only for staging/demo environments.
#   - Use DRY_RUN=true to preview without committing.

SCRIPT_NAME="$(basename "$0")"
ALLOW_NON_EMPTY_SEED="${ALLOW_NON_EMPTY_SEED:-false}"
DRY_RUN="${DRY_RUN:-false}"
BOT_EMAIL_DOMAIN="${BOT_EMAIL_DOMAIN:-seed.sbay.local}"

if ! command -v psql >/dev/null 2>&1; then
  echo "error: psql is required but was not found in PATH." >&2
  exit 1
fi

if [ "${ALLOW_NON_EMPTY_SEED}" != "true" ] && [ "${ALLOW_NON_EMPTY_SEED}" != "false" ]; then
  echo "error: ALLOW_NON_EMPTY_SEED must be true or false." >&2
  exit 1
fi

if [ "${DRY_RUN}" != "true" ] && [ "${DRY_RUN}" != "false" ]; then
  echo "error: DRY_RUN must be true or false." >&2
  exit 1
fi

SQL_FILE="$(mktemp -t sbay-seed-platform.XXXXXX)"
cleanup() {
  rm -f "$SQL_FILE"
}
trap cleanup EXIT

cat >"$SQL_FILE" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEMP TABLE seed_options (
  allow_non_empty_seed boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_options VALUES (:'allow_non_empty_seed'::boolean);

CREATE TEMP TABLE seed_sellers (
  external_id text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  phone text,
  city text NOT NULL,
  avatar_url text NOT NULL,
  average_rating numeric(3,2) NOT NULL,
  review_count int NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE seed_listings (
  seller_external_id text NOT NULL,
  category_name text NOT NULL,
  category_path text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price_amount numeric(12,2) NOT NULL,
  original_price_amount numeric(12,2),
  stock_quantity int NOT NULL,
  region text NOT NULL,
  specific_location text NOT NULL,
  condition text NOT NULL,
  image_1 text NOT NULL,
  image_2 text,
  image_3 text
) ON COMMIT DROP;

INSERT INTO seed_sellers VALUES
  ('seed-bot:levant-tech', 'levant-tech@seed.sbay.local', 'Levant Tech Store', '+963 944 100 221', 'Damascus', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 4.80, 124),
  ('seed-bot:aleppo-home', 'aleppo-home@seed.sbay.local', 'Aleppo Home Finds', '+963 933 208 118', 'Aleppo', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', 4.70, 88),
  ('seed-bot:coastal-style', 'coastal-style@seed.sbay.local', 'Coastal Style Market', '+963 955 441 901', 'Latakia', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', 4.60, 67),
  ('seed-bot:homs-workshop', 'homs-workshop@seed.sbay.local', 'Homs Workshop', '+963 988 771 502', 'Homs', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 4.90, 152),
  ('seed-bot:book-nook', 'book-nook@seed.sbay.local', 'The Book Nook', '+963 999 662 714', 'Damascus', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80', 4.85, 43),
  ('seed-bot:city-mobility', 'city-mobility@seed.sbay.local', 'City Mobility', '+963 932 417 806', 'Tartus', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', 4.65, 59);

INSERT INTO seed_listings VALUES
  ('seed-bot:levant-tech', 'Electronics', 'electronics/phones', 'iPhone 13 128GB Midnight', 'Clean iPhone 13 with strong battery health, original screen, Face ID working, and a clear case included. Light marks on the frame only.', 6900000, 7350000, 1, 'Damascus', 'Malki', 'Used', 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'),
  ('seed-bot:levant-tech', 'Electronics', 'electronics/laptops', 'Lenovo ThinkPad T480 Business Laptop', 'Reliable ThinkPad for work or study. Core i5, 16GB RAM, 512GB SSD, Arabic/English keyboard, charger included.', 4350000, 4800000, 2, 'Damascus', 'Mazzeh', 'Refurbished', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:levant-tech', 'Electronics', 'electronics/audio', 'Sony WH-1000XM4 Headphones', 'Noise cancelling headphones in excellent condition. Comes with travel case, audio cable, and USB-C charging cable.', 1850000, 2100000, 1, 'Damascus', 'Abu Rummaneh', 'LikeNew', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:levant-tech', 'Electronics', 'electronics/gaming', 'PlayStation 5 Disc Edition Bundle', 'PS5 disc console with one controller, HDMI cable, stand, and two games. Tested and ready to use.', 9100000, null, 1, 'Damascus', 'Kafr Sousa', 'Used', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=1200&q=80', null),

  ('seed-bot:aleppo-home', 'Home', 'home/furniture', 'Solid Oak Dining Table for Six', 'Heavy oak dining table with six matching chairs. Minor surface wear, very stable, ideal for a family kitchen or dining room.', 3200000, 3600000, 1, 'Aleppo', 'New Aleppo', 'Good', 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1604578762246-41134e37f9cc?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:aleppo-home', 'Home', 'home/appliances', 'Samsung Front Load Washing Machine 7kg', 'Energy efficient washing machine, serviced recently. Quiet spin cycle and several wash programs.', 2800000, 3150000, 1, 'Aleppo', 'Shahba', 'Used', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:aleppo-home', 'Home', 'home/decor', 'Handwoven Wool Rug 200x300cm', 'Warm patterned rug with dense weave. Professionally cleaned and ready for a living room or bedroom.', 1450000, null, 1, 'Aleppo', 'Aziziyeh', 'Good', 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:aleppo-home', 'Home', 'home/kitchen', 'Espresso Machine with Milk Frother', 'Compact espresso machine, clean boiler, strong pump pressure, includes portafilter and milk pitcher.', 1650000, 1900000, 1, 'Aleppo', 'Sabil', 'LikeNew', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', null),

  ('seed-bot:coastal-style', 'Clothing', 'clothing/women', 'Linen Summer Dress - Size M', 'Lightweight linen dress in soft blue, worn once for a photoshoot. Comfortable cut and clean stitching.', 420000, 520000, 3, 'Latakia', 'Project 10', 'LikeNew', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:coastal-style', 'Clothing', 'clothing/men', 'Leather Jacket - Dark Brown', 'Classic leather jacket with satin lining. No tears, zipper works smoothly, fits medium to large.', 1250000, 1500000, 1, 'Latakia', 'American Street', 'Good', 'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:coastal-style', 'Clothing', 'clothing/shoes', 'Nike Running Shoes EU 42', 'Comfortable running shoes with good sole grip. Used lightly for indoor training.', 680000, null, 1, 'Latakia', 'Sleibeh', 'Good', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:coastal-style', 'Clothing', 'clothing/accessories', 'Minimal Leather Backpack', 'Black leather backpack with laptop sleeve, clean interior, and strong zippers.', 740000, 890000, 2, 'Latakia', 'Corniche', 'LikeNew', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=80', null),

  ('seed-bot:homs-workshop', 'Home', 'home/tools', 'Bosch Cordless Drill Kit', 'Cordless drill with two batteries, charger, and bit set. Strong torque and clean chuck.', 980000, 1150000, 1, 'Homs', 'Inshaat', 'Used', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586864387789-628af9feed72?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:homs-workshop', 'Vehicles', 'vehicles/bikes', 'Giant Escape Hybrid Bicycle', 'Hybrid city bike with aluminum frame, 21 speeds, working brakes, and recently replaced tires.', 2200000, 2500000, 1, 'Homs', 'Al Hamra', 'Good', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:homs-workshop', 'Electronics', 'electronics/cameras', 'Canon EOS 80D Camera Body', 'Canon DSLR body with clean sensor, charger, battery, and strap. Great for photography students.', 3900000, 4300000, 1, 'Homs', 'Al Waer', 'Good', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1502920917128-1aa500764ce7?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:homs-workshop', 'Services', 'services/repair', 'Furniture Repair and Refinishing Service', 'Local workshop offering chair repair, table sanding, repainting, and small custom wood projects.', 250000, null, 8, 'Homs', 'Inshaat', 'New', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=1200&q=80', null),

  ('seed-bot:book-nook', 'Books', 'books/textbooks', 'Engineering Mathematics Textbook Set', 'Set of three clean engineering mathematics textbooks with light pencil notes in margins.', 310000, 390000, 1, 'Damascus', 'Baramkeh', 'Good', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:book-nook', 'Books', 'books/novels', 'Arabic Literature Novel Collection', 'Ten novels in good condition, mixed modern and classic authors. Sold as a complete bundle.', 275000, null, 1, 'Damascus', 'Shaalan', 'Good', 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:book-nook', 'Electronics', 'electronics/tablets', 'Kindle Paperwhite 10th Gen', 'Waterproof Kindle Paperwhite with case. Battery lasts weeks and screen is scratch-free.', 920000, 1050000, 1, 'Damascus', 'Old City', 'LikeNew', 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80', null),

  ('seed-bot:city-mobility', 'Vehicles', 'vehicles/scooters', 'Xiaomi Electric Scooter Pro 2', 'Foldable electric scooter with charger, working lights, and strong brakes. Range depends on rider weight and road conditions.', 2850000, 3200000, 1, 'Tartus', 'Corniche', 'Used', 'https://images.unsplash.com/photo-1591378603223-e15b45a81640?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1604671368394-2240d0b1bb6c?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:city-mobility', 'Vehicles', 'vehicles/parts', 'Motorcycle Helmet Full Face', 'Full face helmet with clear visor, clean padding, and adjustable strap. Size L.', 520000, 640000, 2, 'Tartus', 'Al Thawra Street', 'Good', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80', null),
  ('seed-bot:city-mobility', 'Vehicles', 'vehicles/cars', 'Hyundai i10 2014 Manual', 'Compact city car, economical fuel use, manual gearbox, regular maintenance, inspection welcome.', 62500000, null, 1, 'Tartus', 'City Center', 'Used', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80', null);

DO $$
DECLARE
  allow_non_empty boolean;
BEGIN
  SELECT allow_non_empty_seed INTO allow_non_empty FROM seed_options LIMIT 1;

  IF NOT allow_non_empty THEN
    IF EXISTS (
      SELECT 1
      FROM listings l
      WHERE NOT EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = l.seller_id
          AND u.external_id LIKE 'seed-bot:%'
      )
    ) THEN
      RAISE EXCEPTION 'Refusing to seed: non-bot listings already exist. Set ALLOW_NON_EMPTY_SEED=true only for staging/demo environments.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM users u
      WHERE COALESCE(u.external_id, '') NOT LIKE 'seed-bot:%'
        AND u.role <> 'admin'
    ) THEN
      RAISE EXCEPTION 'Refusing to seed: non-admin real users already exist. Set ALLOW_NON_EMPTY_SEED=true only for staging/demo environments.';
    END IF;
  END IF;
END $$;

INSERT INTO categories (name)
SELECT DISTINCT category_name
FROM seed_listings
ON CONFLICT DO NOTHING;

UPDATE users u
SET display_name = s.display_name,
    phone = s.phone,
    city = s.city,
    avatar_url = s.avatar_url,
    role = 'seller',
    status = 'active',
    is_seller = true,
    email_verified = true,
    email_verified_at = COALESCE(u.email_verified_at, now()),
    average_rating = s.average_rating,
    review_count = s.review_count
FROM seed_sellers s
WHERE u.external_id = s.external_id;

INSERT INTO users (
  id, email, password_hash, display_name, phone, city, avatar_url, external_id,
  role, status, email_verified, email_verified_at, is_seller, created_at,
  last_seen, average_rating, review_count
)
SELECT
  gen_random_uuid(),
  replace(s.email, 'seed.sbay.local', :'bot_domain'),
  'seed-bot-account-no-login-' || encode(gen_random_bytes(24), 'hex'),
  s.display_name,
  s.phone,
  s.city,
  s.avatar_url,
  s.external_id,
  'seller',
  'active',
  true,
  now() - interval '90 days',
  true,
  now() - interval '120 days' + (row_number() over (order by s.external_id) * interval '5 days'),
  now() - interval '2 hours',
  s.average_rating,
  s.review_count
FROM seed_sellers s
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.external_id = s.external_id
);

WITH prepared AS (
  SELECT
    u.id AS seller_id,
    c.id AS category_id,
    l.*,
    row_number() over (order by l.seller_external_id, l.title) AS row_no
  FROM seed_listings l
  JOIN users u ON u.external_id = l.seller_external_id
  JOIN categories c ON c.name = l.category_name
)
INSERT INTO listings (
  id, seller_id, category_id, category_path, title, description,
  price_amount, price_currency, original_price_amount, original_price_currency,
  stock_quantity, region, specific_location, status, created_at, updated_at,
  thumbnail_url, condition
)
SELECT
  gen_random_uuid(),
  p.seller_id,
  p.category_id,
  p.category_path,
  p.title,
  p.description,
  p.price_amount,
  'SYP',
  p.original_price_amount,
  CASE WHEN p.original_price_amount IS NULL THEN NULL ELSE 'SYP' END,
  p.stock_quantity,
  p.region,
  p.specific_location,
  'active',
  now() - (p.row_no * interval '9 hours'),
  now() - (p.row_no * interval '2 hours'),
  p.image_1,
  p.condition
FROM prepared p
WHERE NOT EXISTS (
  SELECT 1
  FROM listings existing
  WHERE existing.seller_id = p.seller_id
    AND existing.title = p.title
);

WITH image_rows AS (
  SELECT u.id AS seller_id, l.title, 0 AS position, l.image_1 AS url FROM seed_listings l JOIN users u ON u.external_id = l.seller_external_id
  UNION ALL
  SELECT u.id AS seller_id, l.title, 1 AS position, l.image_2 AS url FROM seed_listings l JOIN users u ON u.external_id = l.seller_external_id WHERE l.image_2 IS NOT NULL
  UNION ALL
  SELECT u.id AS seller_id, l.title, 2 AS position, l.image_3 AS url FROM seed_listings l JOIN users u ON u.external_id = l.seller_external_id WHERE l.image_3 IS NOT NULL
)
INSERT INTO listing_images (id, listing_id, url, position, mime_type, width, height)
SELECT gen_random_uuid(), li.id, ir.url, ir.position, 'image/jpeg', 1200, 800
FROM image_rows ir
JOIN listings li ON li.seller_id = ir.seller_id AND li.title = ir.title
ON CONFLICT (listing_id, position) DO UPDATE
SET url = EXCLUDED.url,
    mime_type = EXCLUDED.mime_type,
    width = EXCLUDED.width,
    height = EXCLUDED.height;

UPDATE listings l
SET thumbnail_url = li.url
FROM listing_images li
WHERE li.listing_id = l.id
  AND li.position = 0
  AND EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = l.seller_id
      AND u.external_id LIKE 'seed-bot:%'
  );

SELECT
  (SELECT count(*) FROM users WHERE external_id LIKE 'seed-bot:%') AS bot_sellers,
  (SELECT count(*) FROM listings l JOIN users u ON u.id = l.seller_id WHERE u.external_id LIKE 'seed-bot:%') AS bot_listings,
  (SELECT count(*) FROM listing_images li JOIN listings l ON l.id = li.listing_id JOIN users u ON u.id = l.seller_id WHERE u.external_id LIKE 'seed-bot:%') AS bot_listing_images;

\if :dry_run
ROLLBACK;
\else
COMMIT;
\endif
SQL

PSQL_ARGS=(-v "allow_non_empty_seed=${ALLOW_NON_EMPTY_SEED}" -v "dry_run=${DRY_RUN}" -v "bot_domain=${BOT_EMAIL_DOMAIN}" -f "$SQL_FILE")

echo "Running ${SCRIPT_NAME} (dry_run=${DRY_RUN}, allow_non_empty_seed=${ALLOW_NON_EMPTY_SEED})"
if [ -n "${DATABASE_URL:-}" ]; then
  psql "$DATABASE_URL" "${PSQL_ARGS[@]}"
else
  psql "${PSQL_ARGS[@]}"
fi

if [ "${DRY_RUN}" = "true" ]; then
  echo "Dry run complete. No data was committed."
else
  echo "Seed complete. Bot sellers are marked with external_id prefix seed-bot:."
fi
