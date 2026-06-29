# Local Development

How to run SBay on your machine and the day-to-day commands. The fastest path is
Docker Compose, which starts the whole stack (web + backend + Postgres + Redis).

## Prerequisites

- **Docker Desktop / Docker Engine** with Compose v2 (the one-command path).
- For working on a single part outside containers:
  - **.NET 9 SDK** (backend).
  - **Node.js** (≈ 20+) and **npm** (frontend).
- Free ports: `3000` (web), `5432` (Postgres), `6379` (Redis), `8080` (backend) —
  override in `.env` if taken.

## Run the whole stack (recommended)

```bash
docker compose up --build
```

This uses [`docker-compose.yml`](../docker-compose.yml) + the dev override
([`docker-compose.override.yml`](../docker-compose.override.yml), applied
automatically), which enables:
- backend **watch mode** (`dotnet watch run`),
- frontend **dev mode** (`next dev`) with `/api` proxied to the backend.

Then open:
- Web: <http://localhost:3000>
- Backend health: <http://localhost:8080/health/ready>
- Swagger (dev only): <http://localhost:8080/swagger>
- Postgres: `localhost:5432` · Redis: `localhost:6379`

On first start, Postgres initializes from [`Database/*.sql`](../Database) (schema
+ demo/seed data).

### Production-style local run (no dev override)

```bash
docker compose -f docker-compose.yml up --build
```

### Reset local database state

The init SQL only runs when the Postgres volume is first created. To wipe and
reinitialize:

```bash
docker compose down -v
docker compose up --build
```

## Configuration

Compose has safe local defaults. To customize ports/secrets/CORS/API URLs:

```bash
cp .env.example .env   # then edit
```

For local dev set at least: `Jwt__Secret` (or `JWT_SECRET`),
`ConnectionStrings__Default`, `Cors__AllowAnyOrigin=false`, and
`Cors__AllowedOrigins__0` = your frontend origin. See
[`.env.example`](../.env.example) for the full list.

## Working on the backend only

```bash
dotnet restore sbay.sln
dotnet build sbay.sln --no-restore
dotnet test sbay.sln --no-build
```

- Entry point / DI / middleware: [`Program.cs`](../Backend/SBay.Backend/Program.cs).
- Run against a local Postgres (e.g. the Compose one) by setting
  `ConnectionStrings__Default`.
- Tests use a `Testing` environment that relaxes startup guards and can fall back
  to a `sbay_tests` database; integration tests use `WebApplicationFactory`.
- More detail: [backend.md](backend.md).

### EF migrations

```bash
dotnet ef migrations add <Name> --project Backend/SBay.Backend
dotnet ef database update --project Backend/SBay.Backend
```

## Working on the frontend only

The frontend is an npm workspace; run commands from `Frontend/`:

```bash
cd Frontend
npm ci
npm run dev        --workspace=web      # or use the Compose web service
npm run type-check --workspace=web
npm test           --workspace=web -- --runInBand
npm run build      --workspace=web
```

- App code: [`Frontend/web/src`](../Frontend/web/src); shared types/validators:
  [`Frontend/packages/shared`](../Frontend/packages/shared).
- Point the app at a backend with `NEXT_PUBLIC_API_URL` (dev override uses `/api`
  proxied to the backend container).
- More detail: [frontend.md](frontend.md).

## Common gotchas

- **Schema didn't update?** Init SQL only runs on a fresh volume — use
  `docker compose down -v` to reseed, or apply an EF migration.
- **Port already in use?** Override `*_HOST_PORT` / ports in `.env`.
- **CORS errors?** Ensure your frontend origin is in `Cors__AllowedOrigins__*`.
- **Backend won't boot?** It validates config at startup — read the exception; a
  missing/weak `Jwt:Secret`, missing `Jwt:RefreshTokenDays`, or bad connection
  string will stop it on purpose.
- **Google sign-in button disabled?** It's behind the `googleAuthComingSoon` flag
  on the web — see [authentication.md](authentication.md#google-sign-in).

## CI parity

Before pushing, the checks CI runs are the backend `dotnet` trio and the frontend
`type-check` / `test` / `build` above. Running them locally avoids red builds.
See the root [README](../README.md#common-commands).
</content>
