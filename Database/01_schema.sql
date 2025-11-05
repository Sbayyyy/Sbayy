-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
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
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Listings (+ FTS-ready)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE listings (
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
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  thumbnail_url TEXT DEFAULT NULL,
  condition TEXT NOT NULL DEFAULT 'Unknown',
  search_vec tsvector
);

CREATE INDEX idx_listings_seller        ON listings(seller_id);
CREATE INDEX idx_listings_category      ON listings(category_id);
CREATE INDEX idx_listings_category_path ON listings(category_path);
CREATE INDEX idx_listings_created_at    ON listings(created_at);
CREATE INDEX idx_listings_price_amount  ON listings(price_amount);

CREATE INDEX idx_listings_search_gin    ON listings USING GIN (search_vec);
CREATE INDEX idx_listings_title_trgm    ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_listings_desc_trgm     ON listings USING GIN (description gin_trgm_ops);


CREATE OR REPLACE FUNCTION listings_search_vec_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vec :=
    setweight(to_tsvector('simple', coalesce(unaccent(NEW.title), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(unaccent(NEW.description), '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_listings_search_vec
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW EXECUTE FUNCTION listings_search_vec_trigger();

-- ─────────────────────────────────────────────────────────────────────────────
-- Listing images
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  mime_type TEXT,
  height INT,
  width INT
);

CREATE INDEX idx_listing_images_listing_pos ON listing_images(listing_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- Chats & Messages (chat owns messages; participants table allows 1:1 or group)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL, 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_participants (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL, -- optional context
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX ux_chats_listing_buyer_seller
ON chats (listing_id, buyer_id, seller_id);
CREATE INDEX idx_messages_chat_time   ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender_time ON messages(sender_id, created_at DESC);
CREATE INDEX ix_messages_chat_createdat ON messages (chat_id, created_at DESC);
CREATE INDEX ix_messages_receiver_unread ON messages (receiver_id, is_read, created_at DESC);

CREATE OR REPLACE FUNCTION update_chat_timestamp() RETURNS trigger AS $$  
BEGIN  
  UPDATE chats SET updated_at = now() WHERE id = NEW.chat_id;  
  RETURN NEW;  
END  
$$ LANGUAGE plpgsql;  

CREATE TRIGGER trg_update_chat_on_message  
AFTER INSERT ON messages  
FOR EACH ROW EXECUTE FUNCTION update_chat_timestamp();  

-- ─────────────────────────────────────────────────────────────────────────────
-- Carts
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- snapshot of price at time of add
  unit_price_amount NUMERIC(12,2) NOT NULL CHECK (unit_price_amount >= 0),
  unit_price_currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  PRIMARY KEY (cart_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'SYP',
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL, -- can be NULL now
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price      NUMERIC(12,2) NOT NULL CHECK (price >= 0)
);
