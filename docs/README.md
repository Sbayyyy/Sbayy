# SBay Documentation

Welcome. This is the engineering documentation for **SBay** — a full-stack
online marketplace (Syrian Bay / syrian-bay.com). If you're new to the project,
read this page top-to-bottom, then follow the links.

## What is SBay?

A marketplace where users list items for sale, browse/search listings, chat with
sellers in real time, place orders, pay (currently via a mock gateway), leave
reviews, and where sellers can pay to boost listings / run sponsored ads. There
is also an admin/manager area for moderation.

It is a **monorepo** with three deployable parts:

| Part | Tech | Lives in |
|---|---|---|
| **Backend API** | ASP.NET Core 9 (C#), EF Core, PostgreSQL, Redis, SignalR | [`Backend/SBay.Backend`](../Backend/SBay.Backend) |
| **Web frontend** | Next.js (Pages Router), React, TypeScript, Tailwind | [`Frontend/web`](../Frontend/web) |
| **Shared TS package** | Types + validators shared by frontend (and mobile) | [`Frontend/packages/shared`](../Frontend/packages/shared) |

A **mobile app** (Expo/React Native) also consumes this backend but lives in a
separate repository — you'll see mobile-specific auth flows referenced here.

Everything runs together via Docker Compose. Production is a single IONOS VPS
behind Nginx.

## Start here (new engineer path)

1. **[architecture.md](architecture.md)** — the big picture: components, how a
   request flows, what talks to what. Read this first.
2. **[local-development.md](local-development.md)** — get the stack running on
   your machine in a few minutes.
3. Then dive into the area you'll work on:
   - **[backend.md](backend.md)** — API structure, layers, DI, conventions.
   - **[frontend.md](frontend.md)** — web app structure, data fetching, i18n.
   - **[data-model.md](data-model.md)** — entities, tables, relationships.
   - **[authentication.md](authentication.md)** — JWT, refresh tokens, Google
     sign-in, scopes & authorization.
4. **[deployment.md](deployment.md)** — how it ships to production.
5. **[database-operations.md](database-operations.md)** — backups, recovery, and
   DB management/inspection.

## Document index

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | System overview, components, request lifecycle, cross-cutting concerns |
| [backend.md](backend.md) | ASP.NET Core project layout, layering, DI, middleware, conventions |
| [frontend.md](frontend.md) | Next.js web app structure, API layer, realtime, i18n, testing |
| [data-model.md](data-model.md) | Domain entities, PostgreSQL schema, key relationships |
| [authentication.md](authentication.md) | Auth flows, refresh tokens, Google OAuth, scopes & policies |
| [deployment.md](deployment.md) | Production topology, Nginx, Compose, Jenkins, environment config |
| [local-development.md](local-development.md) | Running locally, common commands, tests, resetting state |
| [database-operations.md](database-operations.md) | Backups, PITR plan, DB dashboards, the "no Supabase" decision |

## Conventions used in these docs

- File references link to the actual source so you can jump straight in.
- "🟢 current / 🟡 partial / 🔴 not-done" markers flag implementation maturity
  where relevant.
- These are **living documents**. If you change how something works, update the
  matching doc in the same PR.

## The one-paragraph summary

A React/Next.js web client (and an Expo mobile client) call a stateless ASP.NET
Core REST API over HTTPS. The API persists to PostgreSQL via EF Core using a
repository + unit-of-work pattern, uses Redis to back SignalR (real-time chat),
stores uploaded images on local disk or S3, and authenticates requests with
short-lived JWTs plus rotating opaque refresh tokens. In production, Nginx is the
only public entrypoint and proxies to the web and API containers; everything else
stays on a private Docker network.
</content>
