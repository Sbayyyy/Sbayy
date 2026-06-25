# SBay Marketplace

SBay is a full-stack marketplace application with a Next.js web frontend, ASP.NET Core backend, PostgreSQL database, and Redis cache.

## Quick Start

Prerequisites:

- Docker Desktop or Docker Engine with Compose v2
- Ports `3000`, `5432`, `6379`, and `8080` available, unless overridden in `.env`

Run the full stack:

```bash
docker compose up --build
```

Open:

- Web: `http://localhost:3000`
- Backend health: `http://localhost:8080/health/ready`
- Backend Swagger in development: `http://localhost:8080/swagger`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The default Compose setup starts PostgreSQL, initializes `Database/*.sql`, starts Redis, waits for backend readiness, and starts the frontend.

## Configuration

The Compose file has safe local defaults. To customize ports, credentials, JWT settings, CORS, or API URLs:

```bash
cp .env.example .env
```

Then edit `.env`.

For local development, set at minimum:

- `Jwt__Secret` or `JWT_SECRET` through the local Compose mapping
- `ConnectionStrings__Default`
- `Cors__AllowAnyOrigin=false`
- `Cors__AllowedOrigins__0` for the frontend origin
- S3 storage settings if `Storage__Provider=s3`

## Authentication Security

`JWT_REFRESH_TOKEN_DAYS=180` is the sample default so web and mobile users can stay signed in. The backend requires `Jwt:RefreshTokenDays` at startup and rejects values outside `1..365`.

Refresh tokens are opaque random secrets, stored only as hashes in PostgreSQL. They rotate on refresh and are revoked on logout, password reset, password change, account deactivation/deletion, and admin role/status changes.

Each refresh token records the request user agent and optional `X-Device-Id` metadata. Device binding and anomaly detection are not enforced yet; deployments that need stronger long-lived-session controls should add those checks or lower `JWT_REFRESH_TOKEN_DAYS`.

### Google Sign-In Setup

Google sign-in uses two backend flows:

- Web sends a Google ID token to `POST /api/auth/google`.
- Expo/mobile starts at `GET /api/auth/google/mobile/start?redirectUri=sbay://auth/google`, completes at `GET /api/auth/google/mobile/callback`, and receives the same SBay auth token/refresh-token shape. The backend also allows Expo's `sbay:///auth/google` deep-link form by default.
- Expo Go uses an `exp://<local-host>:<port>/--/auth/google` callback instead of the `sbay` scheme. In `Development`, local Expo Go callbacks on localhost/private network hosts are accepted automatically. Outside `Development`, add the exact callback URL through `GOOGLE_MOBILE_REDIRECT_URI_EXPO_GO` or use a dev-client/production build.

Configure Google Cloud Console:

- Create a Web OAuth client for the web app and backend code exchange.
- Add `https://api.syrian-bay.com/api/auth/google/mobile/callback` as an authorized redirect URI on the Web OAuth client.
- Create an Android OAuth client for package `com.syrianbay.app` with the release SHA fingerprints.
- Configure the OAuth consent screen and production domains.

Set these environment variables in production:

- `GOOGLE_WEB_CLIENT_ID`: Web OAuth client ID.
- `GOOGLE_ANDROID_CLIENT_ID`: Android OAuth client ID, included in backend token audience allow-list.
- `GOOGLE_OAUTH_CLIENT_SECRET`: Web OAuth client secret for mobile authorization-code exchange.
- `GOOGLE_MOBILE_CALLBACK_URL`: Public backend callback URL, usually `https://api.syrian-bay.com/api/auth/google/mobile/callback`.
- `GOOGLE_MOBILE_REDIRECT_URI`: Expo app deep link, usually `sbay://auth/google`.
- `GOOGLE_MOBILE_REDIRECT_URI_ALT`: Optional second Expo deep link, usually `sbay:///auth/google`.
- `GOOGLE_MOBILE_REDIRECT_URI_EXPO_GO`: Optional exact Expo Go callback, for example `exp://192.168.1.10:8081/--/auth/google`.
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`: Web client ID exposed to the Next.js app.

## Common Commands

Frontend checks:

```bash
cd Frontend
npm ci
npm run type-check --workspace=web
npm test --workspace=web -- --runInBand
npm run build --workspace=web
```

Backend checks:

```bash
dotnet restore sbay.sln
dotnet build sbay.sln --no-restore
dotnet test sbay.sln --no-build
```

Docker production-style build without the development override:

```bash
docker compose -f docker-compose.yml up --build
```

Reset local database state:

```bash
docker compose down -v
docker compose up --build
```

## CI

GitHub Actions runs:

- backend restore, build, and tests
- frontend install, type-check, tests, and build
- Docker Compose config validation and image builds

## Production Deployment

### Hosting Requirements

**❌ Ionos Shared Webhosting: NOT SUFFICIENT**

Your current Ionos webhosting package (shared hosting) **cannot run this application** because it typically only supports:
- PHP + MySQL
- Limited storage access
- No Docker containers
- No custom server software (.NET, Node.js, PostgreSQL, Redis)
- No root access for system configuration

**✅ Ionos VPS: REQUIRED**

You need an Ionos VPS (Virtual Private Server) that provides:
- Full root/admin access
- Docker installation capability
- Custom software installation (.NET, Node.js, PostgreSQL, Redis)
- Port configuration (80, 443, 8080, etc.)
- SSL certificate management
- Your 200GB NVMe storage

### IONOS VPS Deployment

The production configuration is set up for an IONOS VPS with local Docker volumes for PostgreSQL, Redis, and uploaded photos.

1. Use an IONOS VPS running Ubuntu 22.04 or newer.
2. Point your domain DNS `A` record to the VPS public IP.
3. Upload the clean project files to `/opt/sbay/`.
4. Configure environment:
   ```bash
   cp .env.prod.example .env.prod
   nano .env.prod
   ```
5. Set at minimum `DOMAIN_NAME`, `FRONTEND_URL`, `APP_PUBLIC_BASE_URL`, `DB_PASSWORD`, `CONNECTION_STRING`, `JWT_SECRET`, and `PAYMENTS_MOCK_WEBHOOK_SECRET`.
6. Run deployment:
   ```bash
   cd /opt/sbay
   chmod +x deploy.sh monitor.sh backup.sh
   ./deploy.sh
   ```

**Storage Details**:
- Photos are stored locally on the IONOS VPS NVMe drive
- Docker volume: `sbay_uploads` at `/var/lib/docker/volumes/sbay_uploads/_data/`
- Served via: `https://<DOMAIN_NAME>/uploads/`
- Capacity: roughly 100,000-400,000 photos at 500KB-2MB average size

**Network and SSL**:
- Nginx is the only public entrypoint on ports `80` and `443`.
- Backend, web, PostgreSQL, and Redis stay on the internal Docker network.
- `deploy.sh` obtains a Let's Encrypt certificate with Certbot if one does not already exist at `/etc/letsencrypt/live/<DOMAIN_NAME>/`.
- API requests use `https://<DOMAIN_NAME>/api/...` and are proxied to backend routes without stripping the `/api` prefix.

**Management**:
```bash
# Check system health
./monitor.sh

# Manual backup
./backup.sh

# Set up daily backup (crontab -e):
0 2 * * * /opt/sbay/backup.sh
```

### Alternative: Cloud Platforms

If VPS management is too complex, consider these alternatives:
- **Render.com**: Use `render.yaml` for one-click deployment
- **Railway**: Drag & drop deploy with built-in PostgreSQL
- **DigitalOcean App Platform**: Managed deployment
- **AWS Lightsail**: VPS with easier management

## Notes

- Local Docker uses local file storage for uploads at `/app/wwwroot/uploads` inside the backend container.
- Database initialization scripts run only when the PostgreSQL volume is first created. Use `docker compose down -v` to reinitialize from scratch.
- The development override enables backend watch mode and frontend dev mode for local work. Use `docker compose -f docker-compose.yml up --build` for a production-style local run.
