# API Consistency Implementation Guide

## Quick Reference: Architectural Standards

### 1. Response Shapes

#### Success Response (200 OK / 201 Created)
```json
{
  "id": "uuid",
  "field": "value",
  "createdAt": "2026-05-09T00:00:00Z"
}
```

#### Error Response (4xx / 5xx)
```json
{
  "status": 400,
  "code": "invalid_input",
  "message": "Field is required.",
  "details": null
}
```

#### Paginated List (200 OK)
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### 2. Pagination Standards

**Query Parameters**:
- `page` (1-indexed): Current page number, default 1
- `limit`: Items per page, default 20, max 100

**Alternate (for cursor/offset pagination)**:
- `skip` (0-indexed): Number of items to skip, default 0
- `take`: Number of items to return, default 20, max 100

**Use helper**: `NormalizePaging(page, limit)` from `ApiControllerBase`

### 3. HTTP Status Codes

| Operation | Status | Example |
|-----------|--------|---------|
| **Create** | 201 Created | `POST /listings` → 201 |
| **Read** | 200 OK | `GET /listings/{id}` → 200 |
| **Update** | 200 OK | `PUT /listings/{id}` → 200 |
| **Delete** | 204 No Content | `DELETE /listings/{id}` → 204 |
| **List** | 200 OK | `GET /listings` → 200 |
| **Validation Error** | 400 Bad Request | Missing required field → 400 |
| **Unauthorized** | 401 Unauthorized | No/invalid token → 401 |
| **Forbidden** | 403 Forbidden | No permission → 403 |
| **Not Found** | 404 Not Found | Resource doesn't exist → 404 |
| **Conflict** | 409 Conflict | State violation → 409 |

### 4. Error Codes (Standardized)

| Code | Status | Meaning |
|------|--------|---------|
| `invalid_input` | 400 | Validation failed |
| `invalid_request` | 400 | Malformed request |
| `unauthorized` | 401 | Auth required / invalid |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | State/uniqueness violation |
| `too_many_requests` | 429 | Rate limit exceeded |
| `internal_error` | 500 | Server error |

### 5. Request/Response DTO Patterns

**Naming Convention**:
```
Create{Resource}Request      // POST body
Update{Resource}Request      // PUT/PATCH body
{Resource}Dto / {Resource}Response  // Response body
```

**Example**:
```csharp
// Request
public record CreateListingRequest(
    string Title,
    string Description,
    decimal Price
);

// Response
public record ListingDto(
    Guid Id,
    string Title,
    decimal Price,
    DateTime CreatedAt
);

// Usage
[HttpPost]
public async Task<ActionResult<ListingDto>> Create(
    [FromBody] CreateListingRequest req,
    CancellationToken ct)
{
    // ...
    return CreatedAtAction(nameof(GetById), new { id = listing.Id }, dto);
}
```

### 6. Validation Patterns

**In DTO** (preferred):
```csharp
public record CreateListingRequest(
    [Required] string Title,
    [StringLength(5000)] string Description,
    [Range(0.01, 1000000)] decimal Price
);
```

**In Controller** (for complex logic):
```csharp
if (string.IsNullOrWhiteSpace(req.Title))
    return ValidationProblem(
        ApiProblemDetails.Validation("Title is required.", nameof(req.Title))
    );
```

### 7. Authorization Checks

**Standard pattern** (always before state changes):
```csharp
var userId = await _resolver.GetUserIdAsync(User, ct);
if (!userId.HasValue) return Unauthorized();

var resource = await _repo.GetAsync(id, ct);
if (resource is null) return NotFound();
if (resource.OwnerId != userId && !User.IsInRole("admin")) return Forbid();

// Safe to proceed
```

**Use helper** (from `ApiControllerBase`):
```csharp
ValidateOwnership(resource.OwnerId, userId);
```

### 8. Entity → DTO Mapping

**Always use DTOs in responses** (never leak entities):
```csharp
// ❌ Bad: Leaks entity
return Ok(listing);

// ✅ Good: Maps to DTO
return Ok(ToDto(listing));

private static ListingDto ToDto(Listing l) => new(
    l.Id,
    l.Title,
    l.Price.Amount,
    l.CreatedAt
);
```

### 9. Pagination Response Format

**Use the new standard**:
```csharp
using SBay.Backend.APIs.Records;

[HttpGet]
public async Task<ActionResult<PagedResponse<ListingDto>>> GetListings(
    [FromQuery] int page = 1,
    [FromQuery] int limit = 20,
    CancellationToken ct = default)
{
    var (pageNum, limitNum) = NormalizePaging(page, limit);
    var (items, total) = await _repo.GetPagedAsync(pageNum, limitNum, ct);
    var dtos = items.Select(ToDto).ToList();
    return Ok(new PagedResponse<ListingDto>(dtos, total, pageNum, limitNum));
}
```

### 10. Error Handling Best Practices

**Throw typed exceptions**:
```csharp
if (!user.IsSeller)
    throw new ForbiddenException("Only sellers can create listings.");
```

**Or return problem details**:
```csharp
if (listing.StockQuantity <= 0)
    return Conflict("Listing is out of stock.");
```

**Never expose stack traces to clients**:
```csharp
// ❌ Bad: Exposes internal details
return Ok(new { error = ex.StackTrace });

// ✅ Good: Generic message
return StatusCode(500, 
    new { status = 500, code = "internal_error", message = "An unexpected error occurred." }
);
```

---

## Checklist for New Endpoints

- [ ] Request body uses `{Resource}Request` record
- [ ] Response uses `{Resource}Dto` record  
- [ ] Validation uses `ApiProblemDetails` helper or data annotations
- [ ] Pagination uses `NormalizePaging()` from `ApiControllerBase`
- [ ] Authorization checks performed before state changes
- [ ] No entities leaked in responses (always use DTO)
- [ ] HTTP status codes follow standards above
- [ ] Error responses include `status`, `code`, `message`, `details`
- [ ] Paginated responses use `PagedResponse<T>` wrapper
- [ ] Created resources return `201 Created` with Location header
- [ ] Deleted resources return `204 No Content`
- [ ] Updated resources return `200 OK` with updated resource

---

## Quick Migration Examples

### Before
```csharp
[HttpGet]
public async Task<ActionResult<List<OrderDto>>> GetMyOrders(
    [FromQuery] int page = 1,
    [FromQuery] int limit = 20,
    CancellationToken ct = default)
{
    var me = await _resolver.GetUserIdAsync(User, ct);
    if (!me.HasValue) return Unauthorized();
    
    var orders = await _repo.GetByBuyerAsync(me.Value, page, limit, ct);
    return Ok(new { orders, total = orders.Count });
}
```

### After
```csharp
[HttpGet]
public async Task<ActionResult<PagedResponse<OrderDto>>> GetMyOrders(
    [FromQuery] int page = 1,
    [FromQuery] int limit = 20,
    CancellationToken ct = default)
{
    var me = await _resolver.GetUserIdAsync(User, ct);
    if (!me.HasValue) return Unauthorized();
    
    var (pageNum, limitNum) = NormalizePaging(page, limit);
    var (items, total) = await _repo.GetByBuyerAsync(me.Value, pageNum, limitNum, ct);
    var dtos = items.Select(ToDto).ToList();
    return Ok(new PagedResponse<OrderDto>(dtos, total, pageNum, limitNum));
}
```

---

## Common Gotchas

1. **Forgetting to inherit from `ApiControllerBase`**: No access to helpers
2. **Mixing `take/skip` and `page/limit`**: Pick one, stick with it
3. **Returning entities instead of DTOs**: Couples client to database schema
4. **Not validating authorization before DELETE**: Allows accidental deletions
5. **Using `Ok()` for 201 Created**: Use `CreatedAtAction()` instead
6. **Inconsistent error field names**: Always `code`, `message`, `status`

---

## References

- RFC 9457: Problem Details for HTTP APIs
- REST API Best Practices: https://restfulapi.net/
- HTTP Status Codes: https://httpwg.org/specs/rfc7231.html#status.codes
