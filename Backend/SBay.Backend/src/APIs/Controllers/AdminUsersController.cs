using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.Exceptions;
using SBay.Backend.Utils;
using SBay.Domain.Entities;
using SBay.Domain.Database;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Policy = "AdminOnly")]
public sealed class AdminUsersController : ControllerBase
{
    private static readonly string[] AllowedRoles = ["user", "seller", "support", "admin"];
    private static readonly string[] AllowedStatuses = ["active", "deactivated", "blocked"];

    private readonly EfDbContext _db;
    private readonly ICurrentUserResolver _resolver;
    private readonly IPasswordHasher<User> _hasher;
    private readonly IRefreshTokenRepository _refreshTokens;

    public AdminUsersController(
        EfDbContext db,
        ICurrentUserResolver resolver,
        IPasswordHasher<User> hasher,
        IRefreshTokenRepository refreshTokens)
    {
        _db = db;
        _resolver = resolver;
        _hasher = hasher;
        _refreshTokens = refreshTokens;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> List(
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] string? status,
        [FromQuery] int take = 50,
        [FromQuery] int skip = 0,
        CancellationToken ct = default)
    {
        if (take <= 0 || take > 200)
            throw new InvalidInputException("Take must be between 1 and 200.");
        if (skip < 0)
            throw new InvalidInputException("Skip must be >= 0.");

        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var text = q.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Email.ToLower().Contains(text) ||
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(text)));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var normalizedRole = NormalizeRole(role);
            query = query.Where(u => u.Role == normalizedRole);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = NormalizeStatus(status);
            query = query.Where(u => u.Status == normalizedStatus);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(u => new AdminUserDto(
                u.Id,
                u.Email,
                u.DisplayName,
                u.Role,
                u.Status,
                u.IsSeller,
                u.EmailVerified,
                u.CreatedAt,
                u.DeactivatedAt,
                u.ListingBanned,
                u.ListingBanUntil,
                u.ListingLimit,
                u.ListingLimitCount))
            .ToListAsync(ct);

        return Ok(users);
    }

    [HttpPost]
    [EnableRateLimiting("registration")]
    public async Task<ActionResult<AdminUserDto>> Create([FromBody] CreateAdminUserRequest req, CancellationToken ct)
    {
        if (req is null)
            throw new InvalidInputException("User payload is required.");

        var email = NormalizeEmail(req.Email);
        if (await _db.Users.AnyAsync(u => u.Email == email, ct))
            throw new InvalidInputException("Email is already used.");

        if (string.IsNullOrWhiteSpace(req.Password) || req.Password.Length < 12 || req.Password.Length > 128)
            throw new InvalidInputException("Password must be between 12 and 128 characters.");

        var role = string.IsNullOrWhiteSpace(req.Role) ? "user" : NormalizeRole(req.Role);
        var status = string.IsNullOrWhiteSpace(req.Status) ? "active" : NormalizeStatus(req.Status);
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            EmailVerified = true,
            EmailVerifiedAt = DateTimeOffset.UtcNow,
            DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? null : req.DisplayName.Trim(),
            Role = role,
            Status = status,
            IsSeller = req.IsSeller ?? role is "seller" or "admin",
            CreatedAt = DateTime.UtcNow,
            DeactivatedAt = status == "deactivated" ? now : null
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        await _db.Users.AddAsync(user, ct);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = user.Id }, ToDto(user));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminUserDto>> Get(Guid id, CancellationToken ct)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            throw new NotFoundException("User not found.");

        return Ok(ToDto(user));
    }

    [HttpPatch("{id:guid}")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AdminUserDto>> Update(Guid id, [FromBody] UpdateAdminUserRequest req, CancellationToken ct)
    {
        if (req is null)
            throw new InvalidInputException("User payload is required.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            throw new NotFoundException("User not found.");

        var me = await _resolver.GetUserIdAsync(User, ct);
        if (me == user.Id && (!string.IsNullOrWhiteSpace(req.Role) || !string.IsNullOrWhiteSpace(req.Status)))
            return BadRequest("Admins cannot change their own role or status.");

        var revokeSessions = false;
        if (!string.IsNullOrWhiteSpace(req.Role))
        {
            var role = NormalizeRole(req.Role);
            if (user.Role == "admin" && role != "admin" && !await HasAnotherAdminExistsAsync(user.Id, ct))
                return BadRequest("Cannot remove or block the last active admin.");
            revokeSessions = !string.Equals(user.Role, role, StringComparison.Ordinal);
            user.Role = role;
            user.IsSeller = role is "seller" or "admin" || user.IsSeller;
        }

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            var status = NormalizeStatus(req.Status);
            if (user.Role == "admin" && status != "active" && !await HasAnotherAdminExistsAsync(user.Id, ct))
                return BadRequest("Cannot remove or block the last active admin.");

            revokeSessions = revokeSessions || !string.Equals(user.Status, status, StringComparison.Ordinal);
            user.Status = status;
            user.DeactivatedAt = status == "deactivated"
                ? user.DeactivatedAt ?? DateTimeOffset.UtcNow
                : null;
        }

        if (req.DisplayNameSet)
            user.DisplayName = string.IsNullOrWhiteSpace(req.DisplayName) ? null : req.DisplayName.Trim();
        if (req.EmailVerified.HasValue)
        {
            user.EmailVerified = req.EmailVerified.Value;
            if (req.EmailVerified.Value)
            {
                user.EmailVerifiedAt ??= DateTimeOffset.UtcNow;
                user.EmailVerificationTokenHash = null;
                user.EmailVerificationExpiresAt = null;
            }
            else
            {
                user.EmailVerifiedAt = null;
            }
        }
        if (req.IsSeller.HasValue)
            user.IsSeller = req.IsSeller.Value;
        if (req.ListingBanned.HasValue)
            user.ListingBanned = req.ListingBanned.Value;
        if (req.ListingBanUntilSet)
            user.ListingBanUntil = req.ListingBanUntil;
        if (req.ListingLimitSet)
            user.ListingLimit = req.ListingLimit;

        if (revokeSessions)
            await _refreshTokens.RevokeAllForUserAsync(user.Id, DateTimeOffset.UtcNow, ct);

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    [HttpPost("{id:guid}/ban")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AdminUserDto>> Ban(Guid id, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            throw new NotFoundException("User not found.");

        var me = await _resolver.GetUserIdAsync(User, ct);
        if (me == user.Id)
            return BadRequest("Admins cannot ban themselves.");

        if (user.Role == "admin" && !await HasAnotherAdminExistsAsync(user.Id, ct))
            return BadRequest("Cannot remove or block the last active admin.");

        user.Status = "blocked";
        await _refreshTokens.RevokeAllForUserAsync(user.Id, DateTimeOffset.UtcNow, ct);
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    [HttpPost("{id:guid}/unban")]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AdminUserDto>> Unban(Guid id, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            throw new NotFoundException("User not found.");

        user.Status = "active";
        user.DeactivatedAt = null;
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    [HttpDelete("{id:guid}")]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            throw new NotFoundException("User not found.");

        var me = await _resolver.GetUserIdAsync(User, ct);
        if (me == user.Id)
            return BadRequest("Admins cannot delete themselves.");

        if (user.Role == "admin" && !await HasAnotherAdminExistsAsync(user.Id, ct))
            return BadRequest("Cannot remove or block the last active admin.");

        var now = DateTimeOffset.UtcNow;
        user.Status = "deactivated";
        user.DeactivatedAt = now;
        user.AccountDeletionRequestedAt = now;
        user.AccountDeletionReason = "Deleted by admin";
        await _refreshTokens.RevokeAllForUserAsync(user.Id, now, ct);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<bool> HasAnotherAdminExistsAsync(Guid userId, CancellationToken ct)
    {
        return await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id != userId && u.Role == "admin" && u.Status == "active", ct);
    }

    private static string NormalizeRole(string role)
    {
        var normalized = role.Trim().ToLowerInvariant();
        if (!AllowedRoles.Contains(normalized))
            throw new InvalidInputException("Role must be one of: user, seller, support, admin.");
        return normalized;
    }

    private static string NormalizeStatus(string status)
    {
        var normalized = status.Trim().ToLowerInvariant();
        if (!AllowedStatuses.Contains(normalized))
            throw new InvalidInputException("Status must be one of: active, deactivated, blocked.");
        return normalized;
    }

    private static string NormalizeEmail(string email)
    {
        if (!EmailValidator.TryNormalize(email, out var normalized))
            throw new BadRequestException("Email is invalid.");
        return normalized;
    }

    private static AdminUserDto ToDto(User user)
    {
        return new AdminUserDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Role,
            user.Status,
            user.IsSeller,
            user.EmailVerified,
            user.CreatedAt,
            user.DeactivatedAt,
            user.ListingBanned,
            user.ListingBanUntil,
            user.ListingLimit,
            user.ListingLimitCount);
    }
}

public sealed record CreateAdminUserRequest(
    string Email,
    string Password,
    string? DisplayName,
    string? Role,
    string? Status,
    bool? IsSeller);

public sealed record AdminUserDto(
    Guid Id,
    string Email,
    string? DisplayName,
    string Role,
    string Status,
    bool IsSeller,
    bool EmailVerified,
    DateTime CreatedAt,
    DateTimeOffset? DeactivatedAt,
    bool ListingBanned,
    DateTimeOffset? ListingBanUntil,
    int? ListingLimit,
    int ListingLimitCount);

public sealed record UpdateAdminUserRequest(
    string? Role,
    string? Status,
    bool? IsSeller,
    bool? ListingBanned,
    DateTimeOffset? ListingBanUntil,
    bool ListingBanUntilSet,
    int? ListingLimit,
    bool ListingLimitSet,
    string? DisplayName,
    bool DisplayNameSet,
    bool? EmailVerified);
