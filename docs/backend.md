# Backend Guide

The backend is an **ASP.NET Core 9** REST API in
[`Backend/SBay.Backend`](../Backend/SBay.Backend). It owns all business logic and
is the only component that touches the database, cache, and file storage.

## Solution layout

[`sbay.sln`](../sbay.sln) contains three projects:

| Project | Purpose |
|---|---|
| [`SBay.Backend`](../Backend/SBay.Backend) | The API itself (controllers, services, data layer, auth). |
| [`SBay.Backend.Tests`](../Backend/SBay.Backend.Tests) | xUnit tests, including `WebApplicationFactory` integration tests. |
| [`SBay.FirestoreTools`](../Backend/SBay.FirestoreTools) | One-off tooling for the legacy Firestore path. |

## Source structure (`src/`)

```
src/
├── APIs/
│   ├── Controllers/      27 controllers — the HTTP surface
│   ├── Records/          Request & Response DTOs (Requests/, Responses/)
│   └── Json/             JSON serialization helpers
├── Authentication/       JWT, Google OAuth, scopes, authz handlers/requirements
├── DataBase/
│   ├── Interfaces/       Repository + IDataProvider + IUnitOfWork contracts
│   ├── Ef/               EF Core implementations (production) + Migrations/
│   ├── Firebase/         Firestore implementations (legacy, disabled)
│   ├── Configurations/   EF entity type configurations
│   └── Queries/          Query objects (listing/image search, category aliases)
├── Entities/             Domain model (User, Listings, Reviews, Monetization, …)
├── Services/             App services (email, storage, payments, shipping, …)
├── Messaging/            Chat domain + SignalR hub + text sanitization
├── Exceptions/           ApiException, HttpExceptions, DatabaseException
└── Utils/                Middleware, Money, Clock, validators, helpers
```

## Layering

The backend follows a pragmatic layered design:

```
Controller  →  Service / Repository  →  EF Core (DbContext)  →  PostgreSQL
   (HTTP)        (business logic /        (persistence)
                  data access)
```

- **Controllers** ([`src/APIs/Controllers`](../Backend/SBay.Backend/src/APIs/Controllers))
  are thin: validate input, enforce authorization, call into services/repositories,
  shape responses. They inherit from `ApiControllerBase` /
  [`ApiControllerBase.cs`](../Backend/SBay.Backend/src/APIs/Controllers/ApiControllerBase.cs).
- **Repositories** ([`src/DataBase`](../Backend/SBay.Backend/src/DataBase)) wrap
  data access behind interfaces. There is one interface per aggregate
  (`IUserRepository`, `IListingRepository`, …) and an `IDataProvider` facade plus
  `IUnitOfWork` for transactional writes.
- **Services** ([`src/Services`](../Backend/SBay.Backend/src/Services)) hold logic
  that isn't a single CRUD call: email sending, image storage, payments,
  monetization, shipping, account deletion, etc.
- **Entities** ([`src/Entities`](../Backend/SBay.Backend/src/Entities)) are the
  domain types persisted by EF. See [data-model.md](data-model.md).

### Data access pattern

The repository indirection (`IDataProvider` + per-aggregate repos + `IUnitOfWork`)
exists so the persistence backend is swappable. Two implementations exist:

- **`Ef*` (production):** EF Core + Npgsql. This is the default and only
  supported provider.
- **`Firebase*` (legacy):** Firestore. **Disabled** — `Program.cs` throws at
  startup if `Database:Provider=firestore` because several repositories are
  incomplete. Treat it as deprecated; don't build on it.

Provider selection happens in [`Program.cs`](../Backend/SBay.Backend/Program.cs)
based on the `Database:Provider` config value (`ef` by default).

## Startup & dependency injection

[`Program.cs`](../Backend/SBay.Backend/Program.cs) is the composition root. In
order, it:

1. Configures **Sentry** (if a valid DSN is set).
2. Selects the DB provider and **registers all repositories** (`AddScoped`).
3. Runs **configuration guards** — `ConfigurationGuard` (refresh-token settings)
   and `ProductionConfigurationGuard` (JWT secret strength, connection string,
   S3 creds). These **throw at startup** if production config is unsafe.
4. Registers `EfDbContext` with `UseNpgsql(...).UseSnakeCaseNamingConvention()`.
5. Registers services: auth (`IGoogleTokenVerifier`, `IGoogleOAuthCodeExchanger`),
   chat (`IChatService`, `IUserOwnership`), email (`IEmailSender` + queue +
   `PasswordResetEmailWorker`), push (`IPushNotificationService` via Expo),
   image storage (`IImageStorageProvider` → local or S3), monetization,
   payments (`IPaymentGateway` → `MockPaymentGateway`), shipping
   (`IShippingService` → `DhlShippingService`), text sanitization pipeline.
6. Registers **SignalR**, **rate limiter policies**, **Swagger**, **CORS**,
   **localization**.
7. Builds the app, bootstraps an admin account if `Admin:Bootstrap:*` is set,
   wires the **middleware pipeline** (see
   [architecture.md](architecture.md#request-lifecycle-backend)), maps
   controllers + the `ChatHub` + health endpoints, and runs.

### Hosted (background) services

- `DeactivatedAccountCleanupHostedService` — periodically purges accounts past
  their deletion grace period.
- `PasswordResetEmailWorker` — drains the `PasswordResetEmailQueue` and sends
  reset emails out of the request path.

## Controllers (HTTP surface)

27 controllers cover the product. Grouped roughly:

| Area | Controllers |
|---|---|
| **Auth & users** | `AuthController`, `UserController`, `AddressesController`, `UserAnalyticsController` |
| **Catalog** | `ListingController`, `FavoritesController`, `RecommendationsController` |
| **Commerce** | `OrderController`, `PaymentsController`, `ShippingController`, `MonetizationController`, `AdsController` |
| **Social** | `ChatsController`, `MessagesController`, `ReviewsController`, `ReportsController` |
| **Platform** | `NotificationsController`, `UploadsController`, `ContactController`, `BugReportsController`, `ClientLogsController`, `PlatformController` |
| **Admin/manager** | `AdminDashboardController`, `AdminUsersController`, `AdminListingsController`, `AdminChatsController` |

Conventions:
- Routes are attribute-based, typically `[Route("api/<area>")]`.
- DTOs live in [`src/APIs/Records`](../Backend/SBay.Backend/src/APIs/Records)
  (`Requests/` and `Responses/`) — controllers don't expose entities directly.
- Authorization is declared with `[Authorize]` + scope/policy attributes; see
  [authentication.md](authentication.md).
- Rate-limited endpoints opt into a named policy (`auth`, `uploads`, `chat`, …).

## Messaging / realtime

[`src/Messaging`](../Backend/SBay.Backend/src/Messaging) contains the chat domain
(`Chat`, `Message`, `Offer`), the SignalR `ChatHub` (mapped at `/hubs/chat`), and
a **text sanitization pipeline** (`HtmlTextSanitizer` + `ProfanityTextSanitizer`
combined in `SanitizationPipeline`) applied to user-generated text. Redis is the
SignalR backplane so chat works across multiple backend instances.

## Error handling

- Throw typed exceptions from [`src/Exceptions`](../Backend/SBay.Backend/src/Exceptions)
  (`ApiException`, `HttpExceptions`, `DatabaseException`).
- `ApiExceptionMiddleware` ([`src/Utils`](../Backend/SBay.Backend/src/Utils))
  converts them to consistent problem-details JSON with a stable `code` field.
- Model-validation failures are auto-converted to `ValidationProblemDetails`
  with `code: "invalid_input"` (configured in `Program.cs`).

## Key NuGet dependencies

`Microsoft.EntityFrameworkCore` + `Npgsql.EntityFrameworkCore.PostgreSQL` +
`EFCore.NamingConventions`, `Microsoft.AspNetCore.Authentication.JwtBearer`,
`Microsoft.AspNetCore.SignalR.StackExchangeRedis`, `Google.Apis.Auth`,
`AWSSDK.S3`, `HtmlSanitizer`, `Sentry.AspNetCore`, `Swashbuckle.AspNetCore`.

## Running & testing

```bash
dotnet restore sbay.sln
dotnet build sbay.sln --no-restore
dotnet test sbay.sln --no-build
```

Tests use a `Testing` environment that relaxes some guards and can fall back to a
local `sbay_tests` database. Integration tests spin up the app with
`WebApplicationFactory` (see
[`Backend/SBay.Backend.Tests`](../Backend/SBay.Backend.Tests)).

## Health endpoints

- `GET /health/live` — process is up.
- `GET /health/ready` — can reach the database (used by Compose/Nginx health
  checks).

## Conventions for contributors

- Keep controllers thin; put logic in services/repositories.
- Never return EF entities directly — map to a Response record.
- Add new persistence behind an interface in `DataBase/Interfaces` with an `Ef`
  implementation; register it in `Program.cs`.
- Schema changes go through **EF migrations** (see [data-model.md](data-model.md)).
- Localize user-facing strings via `Resources/*.resx`.
- If you add config, consider adding a guard so misconfiguration fails fast.
</content>
