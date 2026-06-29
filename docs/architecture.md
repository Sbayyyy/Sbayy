# Architecture Overview

This is the big-picture map of SBay. Read it before the area-specific guides.

## Components

```
                          Internet (HTTPS)
                                │
                        ┌───────▼────────┐
                        │     Nginx      │  public entrypoint (ports 80/443)
                        │  TLS, routing, │  Let's Encrypt certs
                        │  rate limiting │
                        └───┬────────┬───┘
              syrian-bay.com│        │api.syrian-bay.com
                            │        │
                   ┌────────▼──┐  ┌──▼─────────────┐
                   │   Web     │  │   Backend API  │
                   │ Next.js   │  │  ASP.NET Core  │
                   │ (SSR/CSR) │  │   (REST + WS)  │
                   └────┬──────┘  └──┬─────────┬───┘
                        │            │         │
                        └──── /api ──┘         │
                                     │         │
                          ┌──────────▼──┐  ┌───▼─────┐   ┌──────────────┐
                          │ PostgreSQL  │  │  Redis  │   │ Image storage│
                          │  (EF Core)  │  │ (SignalR│   │ local disk   │
                          │             │  │ backplane│  │   or S3      │
                          └─────────────┘  └─────────┘   └──────────────┘
```

All four runtime services (web, backend, postgres, redis) run as containers on a
single VPS, defined in [`docker-compose.prod.yml`](../docker-compose.prod.yml).
Only Nginx is exposed publicly; the containers bind to `127.0.0.1` and the
internal Docker network.

## Who talks to whom

- **Clients** (Next.js web, Expo mobile) call the **REST API** under
  `https://api.syrian-bay.com/api/...` and open a **WebSocket** to
  `/hubs/chat` (SignalR) for real-time chat.
- The **web frontend** also proxies `/api` calls through itself in some setups
  (`NEXT_PUBLIC_API_PROXY_TARGET`), and renders pages server-side.
- The **backend** is the only thing that touches PostgreSQL, Redis, and image
  storage. Clients never connect to the database directly.
- **Redis** is the SignalR backplane (so chat scales across backend instances)
  and is available for caching.

## Tech stack at a glance

**Backend** ([backend.md](backend.md))
- ASP.NET Core 9 / C#, controller-based REST API
- EF Core 9 + Npgsql (PostgreSQL), snake_case naming convention
- SignalR for realtime, with Redis backplane (`StackExchange.Redis`)
- JWT bearer auth + custom refresh tokens; Google sign-in (`Google.Apis.Auth`)
- Image storage abstraction: local disk or S3 (`AWSSDK.S3`)
- Sentry for error tracking; Swagger in development
- Built-in rate limiting, localization (en/ar), HTML/profanity sanitization

**Frontend** ([frontend.md](frontend.md))
- Next.js (Pages Router) + React + TypeScript
- Tailwind CSS, `next-i18next` (Arabic + English, RTL-aware)
- Axios-based API client, React Query, Zustand store
- SignalR client for chat

**Data** ([data-model.md](data-model.md))
- PostgreSQL; schema bootstrapped from [`Database/*.sql`](../Database) on first
  run, and managed by EF Core migrations thereafter.

## Request lifecycle (backend)

A typical authenticated API request flows through this middleware pipeline
(defined in [`Program.cs`](../Backend/SBay.Backend/Program.cs)):

1. **Request ID / trace logging** — assigns `X-Request-ID` + `X-Trace-ID`,
   logs method/path/status/latency.
2. **HTTPS redirect** (outside Testing) and **static files** (`/uploads`,
   served with hardened cache + CSP headers).
3. **Request localization** — sets culture from headers (en/ar).
4. **`ApiExceptionMiddleware`** — converts thrown exceptions into consistent
   problem-details JSON.
5. **CORS** → **Rate limiter** → **Authentication** (JWT).
6. **Active-user gate** — a middleware that rejects requests from
   deactivated/banned accounts with `403 account_inactive`.
7. **Authorization** — scope/policy-based (see [authentication.md](authentication.md)).
8. **Controller action** → **Service / Repository** → **PostgreSQL**.

Responses are normalized JSON; validation failures return a
`ValidationProblemDetails` with `code: "invalid_input"`.

## Cross-cutting concerns

| Concern | How it's handled |
|---|---|
| **Auth** | JWT access tokens (short-lived) + rotating opaque refresh tokens; Google OAuth for web + mobile. See [authentication.md](authentication.md). |
| **Authorization** | Scopes (`listings.write`, `admin:*`, …) + resource-based policy handlers (e.g. "is listing owner"). |
| **Rate limiting** | Per-policy fixed windows (auth, registration, uploads, chat, …) keyed by user or IP. Nginx adds a coarse layer on top. |
| **Realtime** | SignalR `ChatHub` at `/hubs/chat`, Redis backplane. |
| **Errors** | `ApiExceptionMiddleware` + `ApiProblemDetails`; Sentry captures exceptions. |
| **Localization** | `Resources/*.resx` (en/ar) on the backend; `next-i18next` on the web. |
| **File uploads** | `IImageStorageProvider` → local disk (`/uploads`) or S3, selected by config. |
| **Background work** | Hosted services: deactivated-account cleanup, password-reset email worker. |
| **Observability** | Structured request logs, `/health/live` + `/health/ready`, Sentry. |

## Environments

- **Local dev** — `docker-compose.yml` + `docker-compose.override.yml` (watch
  mode for backend, `next dev` for web). See [local-development.md](local-development.md).
- **Production-style local** — `docker-compose.yml` only (no override).
- **Production** — `docker-compose.prod.yml` on the VPS, fronted by Nginx. See
  [deployment.md](deployment.md).

The backend selects behavior by `ASPNETCORE_ENVIRONMENT` (`Development` /
`Production` / `Testing`) and validates configuration hard at startup
(`ConfigurationGuard`, `ProductionConfigurationGuard`) — missing secrets or weak
JWT settings fail fast rather than booting insecure.

## Notable design decisions

- **Database is accessed only through the backend** via a repository abstraction
  (`IDataProvider` + per-aggregate repositories) with a unit-of-work. There were
  two providers — EF/PostgreSQL (production) and Firestore (legacy, disabled).
- **We deliberately stay on EF Core + PostgreSQL** rather than migrating to a
  BaaS like Supabase — see the rationale in
  [database-operations.md](database-operations.md#1-current-architecture-and-why-we-are-not-migrating-to-supabase).
- **Stateless API** — JWTs mean any backend instance can serve any request;
  SignalR uses Redis so chat also scales horizontally.
</content>
