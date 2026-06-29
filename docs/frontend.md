# Frontend Guide

The web frontend is a **Next.js** app (Pages Router) in
[`Frontend/web`](../Frontend/web), written in TypeScript with React and Tailwind
CSS. It is a workspace in an npm monorepo alongside a shared package.

## Monorepo layout

```
Frontend/
├── web/                  the Next.js app (@sbay/web)
└── packages/
    └── shared/           @sbay/shared — types + validators shared with mobile
```

The npm workspace root is `Frontend/`. Commands run with `--workspace=web`.

### `@sbay/shared`

[`Frontend/packages/shared/src`](../Frontend/packages/shared/src) is a small,
dependency-light TypeScript package consumed by both the web app and the (separate)
mobile app:

- `types.ts` — shared domain types / DTO shapes.
- `validators.ts` — input validators (email, text safety, etc.) reused on the
  client so web and mobile validate identically. Imported as `@sbay/shared`
  (e.g. `isValidEmail`, `sanitizeInput`, `createOptionalTextInputValidator`).
- `utils.ts`, `index.ts` — helpers + barrel export.

Keeping validation here means the web and mobile clients enforce the same rules;
the backend still re-validates everything server-side.

## Web app structure (`web/src`)

```
src/
├── pages/            Next.js routes (Pages Router) + pages/api (BFF endpoints)
├── components/       UI, grouped by feature (auth, browse, checkout, listing,
│                     header, home, profile, seller, manager, seo, ui)
├── lib/
│   ├── api/          typed API client modules, one per backend area
│   ├── config.ts     runtime/env config + feature flags
│   ├── store/        client state (Zustand) — e.g. auth store
│   ├── hooks/        reusable React hooks
│   ├── realtime/     SignalR client for chat
│   ├── constants/    cities, categories, etc.
│   └── seo/          schema.org/meta helpers
├── styles/           Tailwind/global CSS
└── __tests__/        Jest tests
```

### Routing (Pages Router)

Routes are files under `src/pages`. Highlights:

| Area | Routes |
|---|---|
| **Auth** | `auth/login`, `auth/register`, `auth/forgetPassword`, `auth/resetPassword`, `auth/verify-email` |
| **Browse/search** | `index`, `browse`, `search`, `category/[slug]`, `[region]/[category]` |
| **Listings** | `listing/[id]`, `listing/sell`, `seller/my-listings`, `seller/listings/[id]/edit` |
| **Commerce** | `cart`, `checkout`, `order-confirmation`, `dashboard/orders/*` |
| **Social** | `messages/index`, `messages/[chatId]`, `favorites` |
| **Account** | `profile`, `profile/settings`, `delete-account`, `user/dashboard`, `seller/dashboard` |
| **Manager/admin** | `manager/dashboard`, `manager/users`, `manager/listings`, `manager/chats`, `manager/reports`, `manager/logs` |
| **Marketing/legal** | `about`, `how-it-works`, `fees`, `terms`, `privacy-policy`, `*-protection`, `seller-guide`, … |
| **Infra** | `api/health`, `sitemap.xml`, `_app`, `_document`, `404`, `500` |

`pages/api/*` are Next.js server routes used as a thin BFF (e.g. health, and
proxying), separate from the ASP.NET API.

### Data fetching / API layer

[`src/lib/api`](../Frontend/web/src/lib/api) has one typed module per backend
area — `auth.ts`, `listings.ts`, `orders.ts`, `messages.ts`, `reviews.ts`,
`favorites.ts`, `notifications.ts`, `monetization.ts`, `ads.ts`,
`adminDashboard.ts`, `adminManagement.ts`, `adminReports.ts`, `upload.ts`,
`users.ts`, `addresses.ts`, etc. — plus:

- `errors.ts` — `getErrorMessage(...)` to render backend problem-details nicely.
- `transforms.ts` — response shaping.
- `server.ts` — server-side helpers (SSR).

Under the hood it uses **Axios** against the base URL from
[`lib/config.ts`](../Frontend/web/src/lib/config.ts), and **React Query**
(`@tanstack/react-query`) for caching/async state in components. Client UI state
(like the logged-in user/session) lives in a **Zustand** store under `lib/store`.

### Configuration & feature flags

[`lib/config.ts`](../Frontend/web/src/lib/config.ts) centralizes config. It reads
**runtime** config (`window.__RUNTIME_CONFIG__`, injected at deploy) with a
fallback to build-time `NEXT_PUBLIC_*` env vars — so the same image can be
re-pointed at a different API/logo without rebuilding. It also exposes
`features` flags (e.g. `googleAuthComingSoon`, `enableSignalR`).

### Realtime

[`lib/realtime`](../Frontend/web/src/lib/realtime) holds the SignalR client that
connects to the backend `ChatHub` (`/hubs/chat`) for live messages.

### Internationalization (i18n)

Uses `next-i18next` with **Arabic (default) and English**, and is RTL-aware.
Translation bundles live in `public/locales/{ar,en}/common.json`. Components pull
strings via `useTranslation('common')` and `t('some.key')`. Pages load
translations in `getServerSideProps`/`getStaticProps` via `serverSideTranslations`.

> When adding user-facing text, add the key to **both** `ar` and `en`
> `common.json` files.

## Styling

Tailwind CSS utility classes, with some shared component classes (`btn`,
`btn-primary`, `input`, `auth-card`, …) defined in the global styles. Feature
components live under `components/<feature>`; shared primitives under
`components/ui`.

## Testing

Jest + Testing Library. Tests live in `src/__tests__`.

```bash
cd Frontend
npm ci
npm run type-check --workspace=web
npm test --workspace=web -- --runInBand
npm run build --workspace=web
```

## How a feature typically comes together

1. Backend exposes an endpoint (controller + DTOs).
2. Add/extend a typed module in `lib/api` to call it.
3. Build UI in `components/<feature>`, fetch via React Query (or SSR helper).
4. Wire it into a route under `pages/`.
5. Add translation keys to `public/locales/{ar,en}/common.json`.
6. Add a Jest test where it makes sense.
</content>
