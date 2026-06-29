# Authentication & Authorization

This covers how SBay verifies *who* a caller is (authentication) and *what*
they're allowed to do (authorization). Backend code lives in
[`src/Authentication`](../Backend/SBay.Backend/src/Authentication) and
[`AuthController`](../Backend/SBay.Backend/src/APIs/Controllers/AuthController.cs).

## Model in one paragraph

Clients log in (email+password or Google) and receive a **short-lived JWT access
token** plus an **opaque refresh token**. The access token is sent as
`Authorization: Bearer <jwt>` on every request and carries the user's id, role,
and **scopes**. When it expires, the client exchanges the refresh token for a new
pair. Refresh tokens are **rotated** on every use and stored only as hashes.

## Access tokens (JWT)

- Issued/validated with `Microsoft.AspNetCore.Authentication.JwtBearer`,
  configured from the `Jwt` section (`JwtOptions`).
- Lifetime: `Jwt:ExpMinutes` (production guard requires **5–120 minutes**).
- Claims include `sub` (user id), role, and `scope`/`scp` (see Scopes below).
- Secret: `Jwt:Secret` — production startup **fails** if it's missing, contains
  `REPLACE_ME`, or is shorter than 32 chars (`ProductionConfigurationGuard` in
  [`Program.cs`](../Backend/SBay.Backend/Program.cs)).

## Refresh tokens

(See also the summary in the root [README](../README.md#authentication-security).)

- **Opaque** random secrets; only a **hash** is stored, in the `refresh_tokens`
  table (`token_hash`, `replaced_by_token_hash`, `expires_at`, `revoked_at`,
  `device_id`, `user_agent`).
- **Rotated on every refresh** — the old token is marked replaced; reuse is
  detectable.
- **Revoked** on logout, password reset, password change, account
  deactivation/deletion, and admin role/status changes.
- Lifetime: `Jwt:RefreshTokenDays` — **required** at startup, must be `1..365`
  (`ConfigurationGuard`). Sample default is 180 days for long-lived web/mobile
  sessions.
- Each token records request `user_agent` and optional `X-Device-Id`. Device
  binding / anomaly detection is **not yet enforced** 🟡 — deployments needing
  stronger controls should add checks or lower the lifetime.

## Auth endpoints (`/api/auth`)

From [`AuthController`](../Backend/SBay.Backend/src/APIs/Controllers/AuthController.cs):

| Method & path | Purpose | Auth |
|---|---|---|
| `POST /register` | Create account (rate-limited `registration`) | anon |
| `POST /login` | Email+password login (rate-limited `auth`) | anon |
| `POST /google` | Web Google sign-in: verify Google **ID token** | anon |
| `GET /google/mobile/start` | Begin mobile OAuth (returns Google auth URL) | anon |
| `GET /google/mobile/callback` | OAuth redirect handler (code → tokens) | anon |
| `POST /google/mobile/callback` | Mobile posts the auth code for exchange | anon |
| `POST /verify-email` | Confirm email with token | anon |
| `POST /request-email-verification` | Resend verification email | **auth** |
| `POST /forgot-password` | Start password reset (enqueues email) | anon |
| `POST /reset-password` | Complete password reset with token | anon |
| `POST /refresh` | Exchange refresh token for a new token pair | refresh token |
| `POST /logout` | Revoke the current refresh token | auth |
| `GET /me` | Current user profile | **auth** |
| `POST /change-password` | Change password (revokes refresh tokens) | **auth** |

## Google sign-in

Two flows share the same backend account-linking logic, implemented via
`IGoogleTokenVerifier` and `IGoogleOAuthCodeExchanger`
([`GoogleTokenVerifier.cs`](../Backend/SBay.Backend/src/Authentication/GoogleTokenVerifier.cs),
[`GoogleOAuthCodeExchanger.cs`](../Backend/SBay.Backend/src/Authentication/GoogleOAuthCodeExchanger.cs)):

- **Web** — the browser obtains a Google **ID token** and POSTs it to
  `/api/auth/google`; the backend verifies it against the configured client IDs.
- **Mobile (Expo)** — starts at `/api/auth/google/mobile/start?redirectUri=...`,
  Google redirects to `/api/auth/google/mobile/callback`, the backend exchanges
  the **authorization code** (using `GOOGLE_OAUTH_CLIENT_SECRET`) and returns the
  same SBay token/refresh-token shape. Expo deep-link schemes
  (`sbay://auth/google`, `sbay:///auth/google`) and Expo Go `exp://` callbacks are
  supported.

Google-linked accounts use the partial-unique `users.external_id` column.

> **Status:** On the **web UI**, the Google button is currently gated behind a
> "coming soon" feature flag (`features.googleAuthComingSoon` in
> [`Frontend/web/src/lib/config.ts`](../Frontend/web/src/lib/config.ts)) — the
> backend flows exist but the web entry point is disabled by default. Set
> `NEXT_PUBLIC_GOOGLE_AUTH_COMING_SOON=false` to enable.

Required Google config (production env): `GOOGLE_WEB_CLIENT_ID`,
`GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_MOBILE_CALLBACK_URL`, `GOOGLE_MOBILE_REDIRECT_URI*`, and
`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` for the web client. Full setup steps are in the
root [README](../README.md#google-sign-in-setup).

## Authorization

Two complementary mechanisms, both in
[`src/Authentication`](../Backend/SBay.Backend/src/Authentication):

### 1. Scopes (coarse capability)

Defined in [`Scopes.cs`](../Backend/SBay.Backend/src/Authentication/Scopes.cs):
`listings.read/write`, `orders.read/write`, `users.read/write/manage`,
`messages.read/write`, and `admin:*`. Scopes are **derived from the user's role +
seller flag** (`Scopes.ForUser` / `ForRole`) and embedded in the JWT.

Important derivations:
- `admin` role → `admin:*` (everything).
- **Unverified email** strips `listings.write`, `messages.write`, `admin:*`.
- A listing-banned user loses `listings.write`.

Endpoints require scopes via policies in
[`ScopePolicies.cs`](../Backend/SBay.Backend/src/Authentication/ScopePolicies.cs)
(enforced by `ScopeRequirementHandler`).

### 2. Resource-based policies (fine-grained ownership)

For "can this specific user act on this specific resource," there are requirement
+ handler pairs under `Requirements/` and `Handlers/`, e.g.:

- `ListingOwnerRequirement` → `ListingOwnerHandler` (only the seller edits their
  listing), plus `CanEditListingHandler`, `ListingActiveHandler`,
  `ListingImageOwnerHandler`.
- `ChatParticipantRequirement` / `ChatMemberRequirement`,
  `CanStartChatRequirement`, `IsMessageReceiverRequirement`,
  `MessageOwnerRequirement`, `NotSelfMessageRequirement`.
- `OrderPartyRequirement` (buyer or seller on the order), `CanCancelOrderHandler`,
  `CanUpdateOrderStatusHandler`.
- `CartOwnerRequirement` / `CanCheckoutCartHandler`.
- `SameUserRequirement` (act only on your own user resource).
- `CurrentAdminRequirementHandler` (admin-only operations).
- `ResourceExistsHandler` (404 vs 403 disambiguation).

Controllers attach these via `[Authorize(Policy = ...)]`. The combination means a
request must pass **both** "has the capability (scope)" and "owns/participates in
the resource (policy)".

## Active-account gate

After authentication, a middleware in `Program.cs` loads the user and rejects
requests from non-active accounts with `403 { code: "account_inactive" }`. This
catches deactivated/blocked users even if they still hold a valid JWT.

## Admin bootstrap

On startup (EF provider), if `Admin:Bootstrap:Email` + `Admin:Bootstrap:Password`
are set and no active admin exists, one is created/promoted (`AdminBootstrap` in
`Program.cs`). Password must be ≥12 chars. **Remove these credentials after the
first successful deploy.**

## Rate limiting

Auth-sensitive endpoints use named rate-limit policies (`auth`, `registration`,
`uploads`, …) keyed by user id (if authenticated) or client IP, configured in
`Program.cs`. Nginx adds a coarser IP-based limit in production.
</content>
