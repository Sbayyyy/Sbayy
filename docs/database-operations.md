# Database Operations & Data Maintenance

Operational reference for SBay's production database: where it runs, how data is
protected, and how to manage/inspect it. This is a living document — update it as
the setup changes.

> Scope: production deployment on a single IONOS VPS, orchestrated by
> [`docker-compose.prod.yml`](../docker-compose.prod.yml).

---

## 1. Current architecture (and why we are not migrating to Supabase)

**The production database is PostgreSQL, accessed via EF Core (Npgsql).** This is
the default and only production-supported provider.

- Wiring: [`Program.cs`](../Backend/SBay.Backend/Program.cs) — `UseNpgsql(connStr).UseSnakeCaseNamingConvention()`.
- Repository abstraction: `IDataProvider` + per-aggregate interfaces under
  `Backend/SBay.Backend/src/DataBase/Interfaces/`, with EF implementations under
  `.../Ef/` and migrations under `.../Ef/Migrations/`.
- **Firestore is legacy / not production-ready.** The Firestore provider exists
  under `.../Firebase/` but is guarded to fail fast with *"Firestore provider is
  not production-ready"*. Treat it as deprecated; do not build on it.

### Decision: do NOT migrate to Supabase

Considered and declined. Reasoning:

- We already run EF Core + PostgreSQL with a clean repository layer and migrations.
  Supabase's value is its *bundle* (Auth, Storage, Realtime, auto-generated
  REST/GraphQL, Row-Level Security) — but we already have our own .NET backend,
  custom JWT + refresh-token auth, Google OAuth, SignalR, and storage. Adopting
  Supabase's platform would mean **discarding working, mature code** to fit a
  client-talks-directly-to-Postgres model our architecture does not use.
- If we only wanted Supabase's managed Postgres, that is just hosting — Supabase
  is not special there (Neon / RDS / Azure / DigitalOcean are equivalent).
- **Self-hosting Supabase is worse for our goal**: it adds ~8 extra services
  (GoTrue, PostgREST, Realtime, Storage API, Kong, Studio, …) we wouldn't use,
  and the operational maturity we want (backups, PITR, monitoring) is *our*
  responsibility when self-hosting either way.

**Conclusion:** the real goal — "secure and mature data maintenance" — is achieved
by hardening operations around our existing Postgres, not by changing platforms.
See sections 2–3.

---

## 2. Backups & data maintenance

### 2.1 What exists today

| Asset | What it does | Trigger | Retention | Destination |
|---|---|---|---|---|
| [`scripts/weekly_db_backup_cleanup.sh`](../scripts/weekly_db_backup_cleanup.sh) | `pg_dump \| gzip` (integrity-checked with `gzip -t`), then **destructive row cleanup**, `VACUUM ANALYZE` | Jenkins, **weekly** Sundays ([`Jenkinsfile.weekly-db-backup-cleanup`](../Jenkinsfile.weekly-db-backup-cleanup), `H H * * 0`) | 28 days | Local: `/var/jenkins_home/sbay-db-backups` |
| [`backup.sh`](../backup.sh) | Postgres dump + uploads `tar` + Redis `dump.rdb` | **Unknown** — not referenced by any Jenkinsfile (cron? manual?) | 14 days | Local: `/var/sbay/backups` |

### 2.2 Audit findings (by severity)

- **🔴 Critical — backups never leave the host.** Both scripts write to a local
  directory on the same VPS. A disk/VPS failure destroys the backups *with* the
  data. This is the #1 gap.
- **🔴 Critical — recovery point is up to 7 days.** The only scheduled job is
  weekly, so a failure late in the week loses ~a week of orders/payments/messages.
- **🟠 High — no restore has ever been verified.** `gzip -t` proves the archive
  isn't corrupt, not that it restores into a working DB. Backups are *unproven*
  until one has been restored and booted against.
- **🟠 High — no alerting.** Jenkins archives a log artifact, but nothing pages us
  if the job fails or silently stops running.
- **🟡 Medium — backup is coupled to a large destructive cleanup** in the same
  weekly job (mass `DELETE`s across orders/payments/users). The only safety net
  before those deletes is one weekly, local-only dump.
- **🟡 Medium — no PITR**, and **two divergent scripts** (different dirs, 14 vs 28
  day retention; only `backup.sh` covers uploads + Redis) with unclear ownership.

> Note: user uploads live on local disk (`/var/sbay/uploads`,
> [`docker-compose.prod.yml`](../docker-compose.prod.yml)) — they are data too and
> must be backed up off-host, not just Postgres.

### 2.3 Prioritized remediation plan

Ordered by risk reduced per unit of effort.

| Priority | Action | Closes | Est. |
|---|---|---|---|
| **P0a** | Confirm the job runs **and do one real restore** into a scratch container; boot the app against it | unproven backups | ½ day |
| **P0b** | Ship backups **off-host** (DB + uploads) to object storage (R2/B2/S3), encrypted, with retention | total-loss risk | ½ day |
| **P0c** | **Dead-man's-switch alert** (e.g. Healthchecks.io ping at job end) so a missed/failed backup pages us | silent failure | small |
| **P1a** | Raise frequency: weekly → **daily** DB backup | 7-day RPO | small |
| **P1b** | Add **PITR** (pgBackRest or wal-g WAL archiving to object storage) → restore to any second | weak RPO | ~1 day |
| **P2** | **Decouple** backup from destructive cleanup (separate jobs); **consolidate** the two scripts into one authoritative path covering DB + uploads + Redis | coupling, drift | ~½ day |
| **P3** | Disk + DB monitoring/alerts (disk-full, connections, long queries); patch cadence for `postgres:16-alpine` gated by a restore test | silent degradation | ½ day |
| **P4** | (Optional, defer) streaming replica / standby for uptime — addresses downtime, not data loss | HA | 1–2 days |

**Open questions to confirm:**
1. Does Jenkins run on the **same VPS** as the stack? If so, `/var/jenkins_home`
   backups are same-host and do **not** count as off-host (P0b still required).
2. How is `backup.sh` actually triggered — cron, or dead code?

---

## 3. Database management & inspection

### 3.1 Access model — SSH tunnel only (no public exposure)

The DB is **not reachable from outside the VPS** (the `postgres` service has no
host port mapping — network-only). Keep it that way. **A database admin UI must
never be exposed to the internet.** All access goes through the SSH access we
already have, via local port-forwarding.

### 3.2 Division of labor

| Tool | Job | Notes |
|---|---|---|
| **SBay admin page** (in-app) | Routine business ops — moderate/delete listings, ban users | Preferred for day-to-day: constrained actions, audit trail, has an undo path. |
| **DB dashboard (pgHero)** | Performance + health: slow queries, missing/unused indexes, bloat, locks, live queries | For the operator. Fills the gap Netdata leaves. |
| **Desktop client (DBeaver/TablePlus)** | Ad-hoc inspection, schema, run SQL, emergency edits | Raw access — no undo, no audit. Not for routine changes. |
| **Netdata** | Host health (CPU/RAM/disk) | Already in place. |

Rule of thumb: routine data changes go through the **in-app admin page** (guarded
+ logged); the DB dashboard/desktop client are for diagnosis and emergencies only.

### 3.3 Planned setup (to be implemented)

**Performance → pgHero** (one small container, bound to `127.0.0.1:8071` on the
VPS, talks to Postgres over the Docker network). Requires the
`pg_stat_statements` extension for query insights (a small Postgres config change
+ one restart during a quiet window).

```bash
# from your laptop
ssh -L 8071:127.0.0.1:8071 you@vps
# then open http://localhost:8071
```

**Browse / edit / run SQL → desktop client over the tunnel** (no web admin UI on
the server). Add a **loopback-only** port mapping `127.0.0.1:5432:5432` to the
`postgres` service (still unreachable from the internet), then:

```bash
ssh -L 5432:127.0.0.1:5432 you@vps
# connect DBeaver / TablePlus to localhost:5432
```

> Status: not yet implemented. Decisions captured: desktop client (not web UI) for
> the admin/SQL half; `pg_stat_statements` to be enabled for pgHero.

---

## Changelog

- 2026-06-29 — Initial draft: architecture decision (stay on EF Core + Postgres,
  no Supabase), backup audit + remediation plan, DB management approach.
