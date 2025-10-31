BEGIN;

-- needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- demo categories (idempotent)
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Home'),
  ('Clothing'),
  ('Vehicles'),
  ('Services'),
  ('Real Estate'),
  ('Books')
ON CONFLICT DO NOTHING;

-- demo users (idempotent; requires UNIQUE(email))
INSERT INTO users (id, email, password_hash, display_name, phone, role)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'seller@example.com', '$dev_hash_seller', 'Demo Seller', '+963900000001', 'seller')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, display_name, phone, role)
VALUES
  ('10000000-0000-0000-0000-000000000002', 'buyer@example.com', '$dev_hash_buyer', 'Demo Buyer', '+963900000002', 'user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, display_name, phone, role)
VALUES
  ('10000000-0000-0000-0000-000000000003', 'support@example.com', '$dev_hash_support', 'Support Agent', '+963900000003', 'admin')
ON CONFLICT (email) DO NOTHING;

-- listings (idempotent by NOT EXISTS)
INSERT INTO listings (id, seller_id, category_id, title, description, price, currency, status)
SELECT gen_random_uuid(), u.id, c.id, 'Demo Phone - Model X', 'A demo smartphone listing for development.', 149.99, 'SYP', 'active'
FROM users u CROSS JOIN categories c
WHERE u.email = 'seller@example.com' AND c.name = 'Electronics'
AND NOT EXISTS (
  SELECT 1 FROM listings l WHERE l.seller_id = u.id AND l.title = 'Demo Phone - Model X'
);

INSERT INTO listings (id, seller_id, category_id, title, description, price, currency, status)
SELECT gen_random_uuid(), u.id, c.id, 'Vintage Chair', 'Comfortable vintage chair, good condition.', 39.50, 'SYP', 'active'
FROM users u CROSS JOIN categories c
WHERE u.email = 'seller@example.com' AND c.name = 'Home'
AND NOT EXISTS (
  SELECT 1 FROM listings l WHERE l.seller_id = u.id AND l.title = 'Vintage Chair'
);

INSERT INTO listings (id, seller_id, category_id, title, description, price, currency, status)
SELECT gen_random_uuid(), u.id, c.id, 'Used Bicycle', 'Reliable commuter bike, some wear.', 79.00, 'SYP', 'active'
FROM users u CROSS JOIN categories c
WHERE u.email = 'seller@example.com' AND c.name = 'Vehicles'
AND NOT EXISTS (
  SELECT 1 FROM listings l WHERE l.seller_id = u.id AND l.title = 'Used Bicycle'
);

-- listing images (idempotent by url)
INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/demo-phone-1.jpg', 0
FROM listings l WHERE l.title = 'Demo Phone - Model X'
AND NOT EXISTS (
  SELECT 1 FROM listing_images li WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/demo-phone-1.jpg'
);

INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/vintage-chair-1.jpg', 0
FROM listings l WHERE l.title = 'Vintage Chair'
AND NOT EXISTS (
  SELECT 1 FROM listing_images li WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/vintage-chair-1.jpg'
);

INSERT INTO listing_images (id, listing_id, url, position)
SELECT gen_random_uuid(), l.id, 'https://example.local/img/bicycle-1.jpg', 0
FROM listings l WHERE l.title = 'Used Bicycle'
AND NOT EXISTS (
  SELECT 1 FROM listing_images li WHERE li.listing_id = l.id AND li.url = 'https://example.local/img/bicycle-1.jpg'
);

-- messages
INSERT INTO messages (id, sender_id, receiver_id, listing_id, content)
SELECT gen_random_uuid(), buyer.id, seller.id, l.id,
       'Is this item still available?'
FROM users buyer, users seller, listings l
WHERE buyer.email = 'buyer@example.com' AND seller.email = 'seller@example.com' AND l.title = 'Demo Phone - Model X'
AND NOT EXISTS (
  SELECT 1 FROM messages m
  WHERE m.sender_id = buyer.id AND m.receiver_id = seller.id AND m.listing_id = l.id
    AND m.content = 'Is this item still available?'
);

INSERT INTO messages (id, sender_id, receiver_id, listing_id, content)
SELECT gen_random_uuid(), seller.id, buyer.id, l.id,
       'Yes, it is available. Would you like more photos?'
FROM users buyer, users seller, listings l
WHERE buyer.email = 'buyer@example.com' AND seller.email = 'seller@example.com' AND l.title = 'Demo Phone - Model X'
AND NOT EXISTS (
  SELECT 1 FROM messages m
  WHERE m.sender_id = seller.id AND m.receiver_id = buyer.id AND m.listing_id = l.id
    AND m.content = 'Yes, it is available. Would you like more photos?'
);

-- cart (requires UNIQUE(carts.user_id) for ON CONFLICT to work as written)
INSERT INTO carts (id, user_id, updated_at)
SELECT gen_random_uuid(), u.id, now()
FROM users u WHERE u.email = 'buyer@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- cart item
INSERT INTO cart_items (cart_id, listing_id, quantity, price_at_added)
SELECT c.id, l.id, 1, l.price
FROM carts c
JOIN users u ON u.email = 'buyer@example.com' AND c.user_id = u.id
JOIN listings l ON l.title = 'Demo Phone - Model X'
WHERE NOT EXISTS (
  SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id AND ci.listing_id = l.id
);

-- order + order_items
WITH buyer AS (
  SELECT id FROM users WHERE email = 'buyer@example.com'
), sel AS (
  SELECT id FROM users WHERE email = 'seller@example.com'
), item AS (
  SELECT id, price FROM listings WHERE title = 'Vintage Chair'
)
INSERT INTO orders (id, buyer_id, seller_id, total, currency, status, created_at)
SELECT gen_random_uuid(), buyer.id, sel.id, item.price * 1, 'SYP', 'created', now()
FROM buyer, sel, item
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.buyer_id = buyer.id AND o.seller_id = sel.id
    AND o.total = item.price AND o.created_at > now() - INTERVAL '1 year'
);

WITH last_order AS (
  SELECT id FROM orders
  WHERE buyer_id = (SELECT id FROM users WHERE email = 'buyer@example.com')
    AND seller_id = (SELECT id FROM users WHERE email = 'seller@example.com')
  ORDER BY created_at DESC
  LIMIT 1
), item AS (
  SELECT id, price FROM listings WHERE title = 'Vintage Chair'
)
INSERT INTO order_items (order_id, listing_id, quantity, price)
SELECT lo.id, item.id, 1, item.price
FROM last_order lo, item
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = lo.id AND oi.listing_id = item.id
);

COMMIT;
