-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums (create if missing)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('active','sold','hidden','deleted');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_condition') THEN
    CREATE TYPE item_condition AS ENUM ('Unknown','New','LikeNew','Good','Fair','Poor');
  END IF;

  -- Align with EF OrderStatus enum and converter (lowercase values).
  -- We intentionally omit any non-modeled states (e.g., 'created').
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending','paid','shipped','completed','cancelled');
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Legacy-to-current migrations (safe if rerun)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Ensure users.created_at has a default if the table exists but older schema lacked it
  IF to_regclass('public.users') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='created_at' AND column_default IS NULL
    ) THEN
      EXECUTE 'ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now()';
    END IF;

    -- Ensure users.role has a default as well for legacy DBs
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='role' AND column_default IS NULL
    ) THEN
      EXECUTE 'ALTER TABLE users ALTER COLUMN role SET DEFAULT ''user''';
    END IF;
  END IF;

  -- Safeguard: only run orders migrations if table exists
  IF to_regclass('public.orders') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='total'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='total_amount'
    ) THEN
      EXECUTE 'ALTER TABLE orders RENAME COLUMN total TO total_amount';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='currency'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='total_currency'
    ) THEN
      EXECUTE 'ALTER TABLE orders RENAME COLUMN currency TO total_currency';
    END IF;

    -- Ensure columns exist (if table predated them)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='total_amount'
    ) THEN
      EXECUTE 'ALTER TABLE orders ADD COLUMN total_amount numeric(12,2)';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='orders' AND column_name='total_currency'
    ) THEN
      EXECUTE 'ALTER TABLE orders ADD COLUMN total_currency varchar(3) DEFAULT ''EUR''';
    END IF;

    -- If status column exists as text, and current values are compatible,
    -- migrate it to the PostgreSQL enum type used by EF mapping.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='orders' AND column_name='status' AND udt_name <> 'order_status'
    ) THEN
      -- Ensure no unexpected statuses are present before altering the type
      IF NOT EXISTS (
        SELECT 1 FROM orders WHERE status NOT IN ('pending','paid','shipped','completed','cancelled')
      ) THEN
        EXECUTE 'ALTER TABLE orders ALTER COLUMN status TYPE order_status USING status::order_status';
      END IF;
    END IF;
  END IF;

  -- Safeguard: only run order_items migrations if table exists
  IF to_regclass('public.order_items') IS NOT NULL THEN
    -- order_items: rename price -> price_amount
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='order_items' AND column_name='price'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='order_items' AND column_name='price_amount'
    ) THEN
      EXECUTE 'ALTER TABLE order_items RENAME COLUMN price TO price_amount';
    END IF;

    -- add price_amount if still missing (older DBs)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='order_items' AND column_name='price_amount'
    ) THEN
      EXECUTE 'ALTER TABLE order_items ADD COLUMN price_amount numeric(12,2)';
    END IF;

    -- add price_currency if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='order_items' AND column_name='price_currency'
    ) THEN
      EXECUTE 'ALTER TABLE order_items ADD COLUMN price_currency varchar(3) DEFAULT ''EUR''';
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  is_seller BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Listings (+ FTS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  category_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
  price_currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  original_price_amount NUMERIC(12,2),
  original_price_currency VARCHAR(8),
  stock_quantity INT NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
  region TEXT,
  status listing_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  thumbnail_url TEXT,
  condition item_condition NOT NULL DEFAULT 'Unknown',
  search_vec tsvector
);

CREATE INDEX IF NOT EXISTS idx_listings_seller        ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category      ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_path ON listings(category_path);
CREATE INDEX IF NOT EXISTS idx_listings_created_at    ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_price_amount  ON listings(price_amount);
CREATE INDEX IF NOT EXISTS idx_listings_search_gin    ON listings USING GIN (search_vec);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm    ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_desc_trgm     ON listings USING GIN (description gin_trgm_ops);

CREATE OR REPLACE FUNCTION listings_search_vec_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vec :=
    setweight(to_tsvector('simple', coalesce(unaccent(NEW.title), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(unaccent(NEW.description), '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_search_vec ON listings;
CREATE TRIGGER trg_listings_search_vec
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION listings_search_vec_trigger();

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Listing images
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  mime_type TEXT,
  height INT,
  width INT
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_pos ON listing_images(listing_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Chats & Messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NULL,
  buyer_archived BOOLEAN NOT NULL DEFAULT FALSE,
  seller_archived BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_chats_buyer_ne_seller CHECK (buyer_id <> seller_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chats_listing_buyer_seller
  ON chats (listing_id, buyer_id, seller_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chats_buyer_seller_null_listing
  ON chats (buyer_id, seller_id)
  WHERE listing_id IS NULL;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_time        ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_time      ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread  ON messages(receiver_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION update_chat_last_message_at() RETURNS trigger AS $$
BEGIN
  UPDATE chats SET last_message_at = NEW.created_at WHERE id = NEW.chat_id;
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chat_on_message ON messages;
CREATE TRIGGER trg_update_chat_on_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_chat_last_message_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Carts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_added NUMERIC(12,2) NOT NULL CHECK (price_at_added >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  PRIMARY KEY (cart_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Use PostgreSQL enum that matches EF mapping; default is lowercase
  status order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  total_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_seller_status_time ON orders(seller_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_time        ON orders(buyer_id, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_amount NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
  price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR'
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
