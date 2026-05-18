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
  city TEXT,
  avatar_url TEXT,
  external_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  is_seller BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  pending_orders INT NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  listing_banned BOOLEAN NOT NULL DEFAULT FALSE,
  listing_ban_until TIMESTAMPTZ,
  listing_limit INT,
  listing_limit_count INT NOT NULL DEFAULT 0,
  listing_limit_reset_at TIMESTAMPTZ
);

ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS total_orders INT NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS pending_orders INT NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS listing_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS listing_ban_until TIMESTAMPTZ;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS listing_limit INT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS listing_limit_count INT NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS listing_limit_reset_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_external_id ON users(external_id) WHERE external_id IS NOT NULL;
-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT,
  device_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS ix_push_tokens_user_id ON push_tokens(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL DEFAULT 'notification',
  title VARCHAR(160) NOT NULL,
  body VARCHAR(512) NOT NULL,
  href VARCHAR(512),
  data_json JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_unread ON notifications(user_id, is_read, is_archived, created_at DESC);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  replaced_by_token_hash VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  device_id VARCHAR(128),
  user_agent VARCHAR(512)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at);

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
  category_id INT REFERENCES categories(id),
  category_path TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
  price_currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  original_price_amount NUMERIC(12,2),
  original_price_currency VARCHAR(8),
  stock_quantity INT NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
  region TEXT,
  specific_location VARCHAR(200),
  status TEXT NOT NULL DEFAULT 'active',
  boosted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  thumbnail_url TEXT DEFAULT NULL,
  condition TEXT NOT NULL DEFAULT 'Unknown',
  search_vec tsvector
);

ALTER TABLE IF EXISTS listings ADD COLUMN IF NOT EXISTS boosted_until TIMESTAMPTZ;
ALTER TABLE IF EXISTS listings ADD COLUMN IF NOT EXISTS specific_location VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_listings_seller        ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_category      ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_category_path ON listings(category_path);
CREATE INDEX IF NOT EXISTS idx_listings_created_at    ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_price_amount  ON listings(price_amount);
CREATE INDEX IF NOT EXISTS idx_listings_boosted_until ON listings(boosted_until);
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

DROP INDEX IF EXISTS idx_listing_images_listing_pos;
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_listing_images_listing_pos ON listing_images(listing_id, position);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_time ON favorites(user_id, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_chats_buyer_last_message
  ON chats (buyer_id, last_message_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_seller_last_message
  ON chats (seller_id, last_message_at DESC, created_at DESC);

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

-- Reports & User Blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_user_blocks_blocker_id_blocked_user_id
  ON user_blocks (blocker_id, blocked_user_id);
CREATE INDEX IF NOT EXISTS ix_user_blocks_blocked_user_id
  ON user_blocks (blocked_user_id);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  block_requested BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT,
  action TEXT,
  reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_reports_reported_user_id ON reports (reported_user_id);
CREATE INDEX IF NOT EXISTS ix_reports_target_id ON reports (target_id);
CREATE INDEX IF NOT EXISTS ix_reports_status ON reports (status);

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
  currency VARCHAR(3) NOT NULL DEFAULT 'SYP',
  PRIMARY KEY (cart_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  total_currency VARCHAR(3) NOT NULL DEFAULT 'SYP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_seller_status_time ON orders(seller_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_time        ON orders(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_seller_time       ON orders(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_amount NUMERIC(12,2) NOT NULL CHECK (price_amount >= 0),
  price_currency VARCHAR(3) NOT NULL DEFAULT 'SYP'
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  purpose TEXT NOT NULL CHECK (purpose IN ('ListingBoost','OrderPayment')),
  status TEXT NOT NULL CHECK (status IN ('Pending','RequiresAction','Succeeded','Failed','Cancelled','Refunded')),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  metadata_json JSONB,
  checkout_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_transactions_provider_reference
  ON payment_transactions(provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_status ON payment_transactions(status);

CREATE TABLE IF NOT EXISTS listing_boost_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_listing_boost_purchases_payment_transaction
  ON listing_boost_purchases(payment_transaction_id);
CREATE INDEX IF NOT EXISTS ix_listing_boost_purchases_listing_id ON listing_boost_purchases(listing_id);

CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  basis_amount NUMERIC(12,2) NOT NULL,
  fee_amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  rate NUMERIC(8,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_platform_fees_order_id ON platform_fees(order_id);
CREATE INDEX IF NOT EXISTS ix_platform_fees_seller_id ON platform_fees(seller_id);

CREATE TABLE IF NOT EXISTS sponsored_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NOT NULL,
  description VARCHAR(600) NOT NULL,
  image_url TEXT,
  cta_text VARCHAR(80) NOT NULL DEFAULT 'Learn more',
  target_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  priority INT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_sponsored_ads_active_window
  ON sponsored_ads(is_active, starts_at, ends_at, priority);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_listings_status') THEN
    ALTER TABLE listings ADD CONSTRAINT ck_listings_status
      CHECK (status IN ('active','sold','hidden','deleted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_listings_condition') THEN
    ALTER TABLE listings ADD CONSTRAINT ck_listings_condition
      CHECK (condition IN ('Unknown','New','Used','LikeNew','ForParts','Refurbished','Damaged'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_orders_status') THEN
    ALTER TABLE orders ADD CONSTRAINT ck_orders_status
      CHECK (status IN ('pending','paid','shipped','completed','cancelled'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ux_reviews_reviewer_order UNIQUE (reviewer_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller_time ON reviews(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_time ON reviews(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_time ON reviews(reviewer_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS review_helpfuls (
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);
