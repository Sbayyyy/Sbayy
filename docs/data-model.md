# Data Model

SBay persists to **PostgreSQL**. Domain types live in
[`Backend/SBay.Backend/src/Entities`](../Backend/SBay.Backend/src/Entities) and
map to tables via EF Core (snake_case naming). The canonical schema is in
[`Database/01_schema.sql`](../Database/01_schema.sql).

> **Two sources of schema truth, by design:**
> - [`Database/*.sql`](../Database) bootstraps the schema **on first container
>   start** (it's idempotent — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
>   EXISTS`, etc.).
> - **EF Core migrations** ([`src/DataBase/Ef/Migrations`](../Backend/SBay.Backend/src/DataBase/Ef/Migrations))
>   manage schema changes thereafter.
>
> When you change the model, prefer an **EF migration**; keep the SQL bootstrap in
> sync if a fresh-install path needs it.

## Postgres extensions & search

The schema enables `pgcrypto` (UUID generation), `unaccent`, and `pg_trgm`.
Listing search is a generated `tsvector` (`search_vec`) maintained by a trigger
(title weighted `A`, description `B`), plus trigram GIN indexes on `title`/
`description` for fuzzy matching. Several `updated_at` columns are maintained by a
`set_updated_at()` trigger, and `chats.last_message_at` is bumped by a trigger on
message insert.

## Entity groups

Entities are organized by area under `src/Entities`:

- **User/** — `User`, `Address`, `RefreshToken`, `PushToken`,
  `NotificationPreference`, `UserNotification`, `UserBlock`,
  `UserCategoryInterest`, `CurrentUserResolver`.
- **Listings/** — `Listing`, `ListingImage`, `Category`, `FavoriteListing`,
  `CartItem`, `Order`, `OrderItem`, status/condition enums, and small interface
  contracts (`IPriced`, `ICategorized`, `ITimeStamps`, …).
- **Reviews/** — `Review`, `ReviewHelpful`.
- **Monetization/** — `PaymentTransaction`, `ListingBoostPurchase`,
  `PlatformFee`, `SponsoredAd`.
- **Reports/** — `Report`.
- **ShoppingCart/**, **ShoppingList/** — cart aggregates.
- **ClientLogs/** — `ClientLog`, `PasswordResetEmailOutbox`.

## Tables overview

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | Accounts (buyers + sellers; role + status) | root of almost everything |
| `refresh_tokens` | Hashed, rotating refresh tokens | → `users` |
| `push_tokens` | Expo push tokens per device | → `users` |
| `notifications` / `notification_preferences` | In-app notifications + per-user prefs | → `users` |
| `client_logs` | Errors/telemetry reported by clients | → `users` (nullable) |
| `password_reset_email_outbox` | Durable queue for reset emails | → `users` (nullable) |
| `categories` | Listing categories | referenced by `listings` |
| `listings` | Items for sale (price, stock, status, search vec) | → `users` (seller), `categories` |
| `listing_images` | Ordered images per listing | → `listings` |
| `favorites` | User ⇄ listing favorites (composite PK) | → `users`, `listings` |
| `user_category_interests` | Recommendation signal scores | → `users` |
| `chats` | Buyer⇄seller conversation (optionally about a listing) | → `users` ×2, `listings` |
| `messages` | Messages within a chat | → `chats`, `users` ×2, `listings` |
| `user_blocks` | User blocking | → `users` ×2 |
| `reports` | Abuse reports (polymorphic target) | → `users`, `target_id` |
| `carts` / `cart_items` | One cart per user, line items | → `users`, `listings` |
| `orders` / `order_items` | Purchases + line items | → `users` ×2, `listings` |
| `payment_transactions` | Payment intents/results | → `users`, `orders`, `listings` |
| `listing_boost_purchases` | Paid listing boosts | → `listings`, `payment_transactions` |
| `platform_fees` | Commission charged per order | → `orders`, `users` |
| `sponsored_ads` | House/sponsored ad slots | standalone |
| `reviews` / `review_helpfuls` | Seller reviews + helpful votes | → `users`, `listings`, `orders` |

## Central relationships

```
users ──< listings ──< listing_images
  │         │   └─< favorites >─ users
  │         │
  │         └─< order_items >── orders ──< platform_fees
  │                              │  └──< payment_transactions
  │                              │
  ├──< chats ──< messages        └─ buyer_id / seller_id → users
  ├──< reviews >── listings / orders
  ├──< carts ──< cart_items >── listings
  ├──< refresh_tokens / push_tokens / notifications
  └──< reports / user_blocks
```

## Important enums, statuses & invariants

- **User role:** `user | seller | support | admin` (CHECK constraint).
- **User status:** `active | deactivated | blocked` (CHECK constraint).
  A startup gate blocks requests from non-active users (`account_inactive`).
- **Listing status:** `active | sold | hidden | deleted` (CHECK; also a PG enum
  `listing_status`). Soft-deletes use `deleted`/`sold` + timestamps, cleaned up
  later (see [database-operations.md](database-operations.md)).
- **Item condition:** constrained set (`Unknown | New | Used | LikeNew |
  ForParts | Refurbished | Damaged`).
- **Order status:** `pending | paid | shipped | completed | cancelled` (CHECK).
- **Payment purpose:** `ListingBoost | OrderPayment`; **status:** `Pending |
  RequiresAction | Succeeded | Failed | Cancelled | Refunded`.
- **Money** is stored as `NUMERIC(12,2)` + a currency code (default `SYP`), and
  represented in code by a `Money` value type
  ([`src/Utils/Money.cs`](../Backend/SBay.Backend/src/Utils/Money.cs)).
- **Referential safety:** orders reference users with `ON DELETE RESTRICT` (you
  can't delete a user with orders); most child rows cascade; some references
  (e.g. `messages.listing_id`) null out on delete.
- **Uniqueness highlights:** one cart per user; one review per (reviewer, order);
  one chat per (listing, buyer, seller); unique partial index on
  `users.external_id` (for Google-linked accounts).

## Seed / demo data

- [`Database/02_demo.sql`](../Database/02_demo.sql) — demo rows for local dev.
- [`Database/03_ecommerce.sql`](../Database/03_ecommerce.sql) — additional
  commerce seed data.
- [`Database/tables.csv`](../Database/tables.csv) — table inventory reference.

These run only on **first** volume creation. To reseed locally:
`docker compose down -v && docker compose up --build`.

## Making schema changes

1. Update the EF entity in `src/Entities` and its EF configuration in
   `src/DataBase/Configurations` if needed.
2. Create a migration:
   ```bash
   dotnet ef migrations add <Name> --project Backend/SBay.Backend
   ```
3. Review the generated migration; apply via the app or `dotnet ef database update`.
4. If a clean-install path relies on `Database/01_schema.sql`, mirror the change
   there too (idempotent style).
5. If you add a table that needs cleanup/retention, update
   [`scripts/weekly_db_backup_cleanup.sh`](../scripts/weekly_db_backup_cleanup.sh).
</content>
