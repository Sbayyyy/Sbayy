# Deployment

SBay runs in production on a **single IONOS VPS** (Ubuntu) as a Docker Compose
stack, with **Nginx** as the only public entrypoint.

## Production topology

```
Internet ──443/80──> Nginx (host)
                       ├── syrian-bay.com / www  ──> web container  (127.0.0.1:3000)
                       └── api.syrian-bay.com     ──> backend container (127.0.0.1:5000)
                                                       │
                       (internal Docker network)      ├── postgres  (no host port)
                                                       └── redis     (no host port)
   uploads/assets served by Nginx from /var/sbay/{uploads,assets}
```

- Compose file: [`docker-compose.prod.yml`](../docker-compose.prod.yml) (services
  `postgres`, `redis`, `backend`, `web`).
- Reverse proxy: [`nginx.conf`](../nginx.conf) — TLS (Let's Encrypt), HTTP→HTTPS
  redirect, gzip, IP rate limiting, and hardened serving of `/uploads` (only
  whitelisted image extensions; everything else 404s).
- The backend and web containers bind to `127.0.0.1` only; **Postgres and Redis
  have no host port** and are reachable only on the internal Docker network.

## Environment configuration

Production config comes from an env file (`.env.production`, kept on the VPS, not
in git). Templates: [`.env.production.example`](../.env.production.example) /
[`.env.prod.example`](../.env.prod.example).

Must-set values: `DOMAIN_NAME`, `FRONTEND_URL`, `APP_PUBLIC_BASE_URL`,
`DB_PASSWORD`, `CONNECTION_STRING`, `JWT_SECRET`, `JWT_REFRESH_TOKEN_DAYS`,
`PAYMENTS_MOCK_WEBHOOK_SECRET`, SMTP (`EMAIL_*`), and — if using Google sign-in or
S3 — the corresponding `GOOGLE_*` / `STORAGE_S3_*` values. The backend's
**startup guards fail the boot** if production secrets are missing or weak, so a
misconfigured deploy won't silently come up insecure.

Key backend env groups (see `docker-compose.prod.yml` for the full list):
`ConnectionStrings__Default`, `Jwt__*`, `Redis__*`, `Authentication__Google__*`,
`Email__*`, `Storage__*`, `Cors__*`, `RateLimits__*`, `Payments__*`,
`Monetization__*`, `AccountDeletion__*`, `Admin__Bootstrap__*`.

## First-time deploy

[`deploy.sh`](../deploy.sh) automates VPS setup:

1. Installs Docker, Compose plugin, and Certbot.
2. Validates the Compose config and that `.env.production` + project dirs exist.
3. `docker compose -f docker-compose.prod.yml up -d --build`.
4. Waits, then health-checks `/health/ready` and the web root.

Outline (see the root [README](../README.md#ionos-vps-deployment) for full steps):

```bash
# on the VPS, project at ~/apps/sbay/Sbayy (or /opt/sbay)
cp .env.production.example .env.production   # then edit secrets
chmod +x deploy.sh monitor.sh backup.sh
./deploy.sh
```

TLS: `deploy.sh`/Nginx obtain Let's Encrypt certs via Certbot for
`syrian-bay.com`, `www.`, and `api.` if not already present.

## Storage

- Default production storage is **local disk** (`Storage__Provider=local`) under
  `/var/sbay/uploads`, served by Nginx at `https://api.syrian-bay.com/uploads/`.
- Alternatively **S3** (`Storage__Provider=s3`) — requires
  `Storage__S3__{AccessKey,SecretKey,Bucket,Endpoint,PublicBaseUrl}`; the
  production guard enforces these when S3 is selected. Implementation:
  `S3ImageStorageProvider` vs `LocalImageStorageProvider`.

## CI/CD (Jenkins + GitHub Actions)

- **GitHub Actions** runs on PRs: backend restore/build/test, frontend
  install/type-check/test/build, and Docker Compose config validation.
- **Jenkins** pipelines (run on/near the VPS):
  - [`Jenkinsfile`](../Jenkinsfile) — main deploy pipeline.
  - [`Jenkinsfile.weekly-db-backup-cleanup`](../Jenkinsfile.weekly-db-backup-cleanup)
    — weekly DB backup + data-retention cleanup (see
    [database-operations.md](database-operations.md)).
  - [`Jenkinsfile.seed-bot-lifecycle`](../Jenkinsfile.seed-bot-lifecycle) — seed
    bot lifecycle automation.

## Operations

```bash
./monitor.sh        # system/health snapshot
./backup.sh         # manual full backup (DB + uploads + redis)
docker compose -f docker-compose.prod.yml ps      # service status
docker compose -f docker-compose.prod.yml logs -f backend
```

Health endpoints (proxied by Nginx, logging off): `/health/live`, `/health/ready`.

See **[database-operations.md](database-operations.md)** for the backup audit,
the remediation plan (off-host backups, PITR, alerting), and DB
management/inspection over SSH tunnels.

## Alternative hosting

[`render.yaml`](../render.yaml) exists for a one-click Render.com deploy as an
alternative to the VPS. Railway / DigitalOcean App Platform / AWS Lightsail are
also viable (the app is just containers + Postgres + Redis).

## Deploy checklist

- [ ] `.env.production` has all required secrets; no `REPLACE_ME` / placeholder
      values (startup guard will reject them).
- [ ] DNS `A` records for apex, `www`, and `api` point to the VPS.
- [ ] TLS certs issued for all three hostnames.
- [ ] `/health/ready` returns 200 (DB reachable).
- [ ] Backups verified off-host and a restore tested (see ops doc).
- [ ] `Admin:Bootstrap:*` removed after the first successful deploy.
</content>
