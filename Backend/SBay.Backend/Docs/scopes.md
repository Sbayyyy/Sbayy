# SBay API Scopes

This document defines the scope model used by the SBay backend. Scopes are enforced
via `ScopeRequirement` policies (e.g. `Scope:listings.write`) rather than relying
only on `[Authorize]`.

## Scope claim
- Claim name: `scope` (space-separated values)
- Alternate claim names supported: `scp`, `permissions`

## Core scopes
- `listings.read`
- `listings.write`
- `orders.read`
- `orders.write`
- `users.read`
- `users.write`
- `users.manage` (admin/support access to other users' data)
- `messages.read`
- `messages.write`
- `admin:*` (wildcard for all scopes)

## Role to scope mapping
- buyer (`user`): listings.read, orders.read/write, users.read/write, messages.read/write
- seller (`seller` or `IsSeller = true`): buyer scopes + listings.write
- support: users.manage, users.read, orders.read, messages.read, listings.read
- admin: admin:*

## How to apply on endpoints
Use policy-based authorization with `ScopePolicies`:

```csharp
[Authorize(Policy = ScopePolicies.ListingsWrite)]
public Task<ActionResult<ListingResponse>> Create(...)
```

If the endpoint is public, keep it `[AllowAnonymous]` or omit `[Authorize]`.

## Adding new scopes
1. Add the new scope constant in `Scopes`.
2. Add the policy name in `ScopePolicies`.
3. Register the policy automatically via `Scopes.All`.
4. Update role mappings in `Scopes.ForRole`.
5. Apply `[Authorize(Policy = ScopePolicies.<ScopeName>)]` to the endpoint.
