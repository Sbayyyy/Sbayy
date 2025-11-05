BEGIN;

-- ─────────────────────────────────────────
-- Extensions (safe if re-run)
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────
-- Ensure required columns on listings (match EF model)
-- ─────────────────────────────────────────
ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS stock_quantity              integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS category_path               text,
    ADD COLUMN IF NOT EXISTS price_amount                numeric(12,2),
    ADD COLUMN IF NOT EXISTS price_currency              varchar(8),
    ADD COLUMN IF NOT EXISTS original_price_amount       numeric(12,2),
    ADD COLUMN IF NOT EXISTS original_price_currency     varchar(8),
    ADD COLUMN IF NOT EXISTS region                      text,
    ADD COLUMN IF NOT EXISTS search_vec                  tsvector;

-- ─────────────────────────────────────────
-- FTS function + trigger for listings.search_vec
-- (recomputes on title/description changes)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION listings_search_vec_tsv()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vec :=
    to_tsvector('simple',
      coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_listings_search_vec') THEN
    CREATE TRIGGER trg_listings_search_vec
    BEFORE INSERT OR UPDATE OF title, description ON listings
    FOR EACH ROW
    EXECUTE FUNCTION listings_search_vec_tsv();
  END IF;
END$$;

-- Indexes for FTS and ILIKE on title
CREATE INDEX IF NOT EXISTS idx_listings_search_vec ON listings USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);

-- ─────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Home'),
  ('Clothing'),
  ('Vehicles'),
  ('Services'),
  ('Real Estate'),
  ('Books')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────
-- Users (unique by email)
-- ─────────────────────────────────────────
INSERT INTO users (id, email, password_hash, display_name, phone, role, is_seller)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'seller@example.com',  '$dev_hash_seller',  'Demo Seller',   '+963900000001', 'seller', true),
  ('10000000-0000-0000-0000-000000000002', 'buyer@example.com',   '$dev_hash_buyer',   'Demo Buyer',    '+963900000002', 'user',   false),
  ('10000000-0000-0000-0000-000000000003', 'support@example.com', '$dev_hash_support', 'Support Agent', '+963900000003', 'admin',  false)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────
-- Listings (price_amount/price_currency + category_path)
-- ─────────────────────────────────────────
INSERT INTO listings (id, seller_id, category_id, category_path, title, description,
                      price_amount, price_currency, status, created_at, updated_at,thumbnail_url)
SELECT gen_random_uuid(), u.id, c.id, 'electronics/phones',
       'Demo Phone - Model X', 'A demo smartphone listing for development.',
       149.99, 'SYP', 'active', now() - interval '1 day', now(),'https://example.local/img/demo-phone-thumb.jpg'
FROM users u
JOIN categories c ON c.name = 'Electronics'
WHERE u.email = 'seller@example.com'
  AND NOT EXISTS (
        SELECT 1 FROM listings l
        WHERE l.seller_id = u.id AND l.title = 'Demo Phone - Model X'
      );

INSERT INTO listings (id, seller_id, category_id, category_path, title, description,
                      price_amount, price_currency, status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, c.id, 'home/furniture',
       'Vintage Chair', 'Comfortable vintage chair, good condition.',
       39.50, 'SYP', 'active', now() - interval '2 day', now()
FROM users u
JOIN categories c ON c.name = 'Home'
WHERE u.email = 'seller@example.com'
  AND NOT EXISTS (
        SELECT 1 FROM listings l
        WHERE l.seller_id = u.id AND l.title = 'Vintage Chair'
      );

INSERT INTO listings (id, seller_id, category_id, category_path, title, description,
                      price_amount, price_currency, status, created_at, updated_at)
SELECT gen_random_uuid(), u.id, c.id, 'vehicles/bikes',
       'Used Bicycle', 'Reliable commuter bike, some wear.',
       79.00, 'SYP', 'active', now() - interval '3 day', now()
FROM users u
JOIN categories c ON c.name = 'Vehicles'
WHERE u.email = 'seller@example.com'
  AND NOT EXISTS (
        SELECT 1 FROM listings l
        WHERE l.seller_id = u.id AND l.title = 'Used Bicycle'
      );

-- Force FTS (only for pre-existing rows that might be missing it)
UPDATE listings SET title = title WHERE search_vec IS NULL;

-- ─────────────────────────────────────────
-- Listing images
-- ─────────────────────────────────────────
INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/demo-phone-1.jpg', 0
FROM listings l
WHERE l.title = 'Demo Phone - Model X'
  AND NOT EXISTS (
        SELECT 1 FROM listing_images li
        WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/demo-phone-1.jpg'
      );

INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/vintage-chair-1.jpg', 0
FROM listings l
WHERE l.title = 'Vintage Chair'
  AND NOT EXISTS (
        SELECT 1 FROM listing_images li
        WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/vintage-chair-1.jpg'
      );

INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/bicycle-1.jpg', 0
FROM listings l
WHERE l.title = 'Used Bicycle'
  AND NOT EXISTS (
        SELECT 1 FROM listing_images li
        WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/bicycle-1.jpg'
      );



-- ─────────────────────────────────────────
-- Cart (unique per user) + cart item (unit_price_*)
-- ─────────────────────────────────────────
INSERT INTO carts (id, user_id, updated_at)
SELECT gen_random_uuid(), u.id, now()
FROM users u
WHERE u.email = 'buyer@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO cart_items (cart_id, listing_id, quantity, unit_price_amount, unit_price_currency)
SELECT c.id, l.id, 1, l.price_amount, l.price_currency
FROM carts c
JOIN users u ON u.email = 'buyer@example.com' AND c.user_id = u.id
JOIN listings l ON l.title = 'Demo Phone - Model X'
WHERE NOT EXISTS (
  SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id AND ci.listing_id = l.id
);

-- ─────────────────────────────────────────
-- Order + order_items
-- ─────────────────────────────────────────
WITH buyer AS (SELECT id FROM users WHERE email = 'buyer@example.com'),
     sel   AS (SELECT id FROM users WHERE email = 'seller@example.com'),
     item  AS (SELECT id, price_amount, price_currency FROM listings WHERE title = 'Vintage Chair' LIMIT 1)
INSERT INTO orders (id, buyer_id, seller_id, total, currency, status, created_at)
SELECT gen_random_uuid(), buyer.id, sel.id, item.price_amount, item.price_currency, 'created', now()
FROM buyer, sel, item
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.buyer_id = buyer.id AND o.seller_id = sel.id
    AND o.total = item.price_amount AND o.created_at > now() - INTERVAL '1 year'
);

WITH last_order AS (
  SELECT id, currency FROM orders
  WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer@example.com')
    AND seller_id = (SELECT id FROM users WHERE email = 'seller@example.com')
  ORDER BY created_at DESC
  LIMIT 1
), item AS (
  SELECT id, price_amount FROM listings WHERE title = 'Vintage Chair' LIMIT 1
)
INSERT INTO order_items (order_id, listing_id, quantity, price)
SELECT lo.id, item.id, 1, item.price_amount
FROM last_order lo, item
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = lo.id AND oi.listing_id = item.id
);

COMMIT;
