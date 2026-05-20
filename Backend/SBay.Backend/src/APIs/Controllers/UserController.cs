using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Utils;
using SBay.Domain.Database;
using SBay.Domain.Authentication;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IListingRepository _listings;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserResolver _userResolver;
    private readonly IConfiguration _config;

    public UserController(
        IUserRepository users,
        IListingRepository listings,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork uow,
        ICurrentUserResolver userResolver,
        IConfiguration config)
    {
        _users = users;
        _listings = listings;
        _refreshTokens = refreshTokens;
        _uow = uow;
        _userResolver = userResolver;
        _config = config;
    }

    [HttpGet("me")]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _users.GetByIdAsync(uid.Value, ct);
        if (user is null) return NotFound();

        var listingsCount = await _listings.CountBySellerAsync(uid.Value, ct);

        var dto = new UserDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.Phone,
            user.City,
            user.AvatarUrl,
            user.Role,
            user.IsSeller,
            user.EmailVerified,
            user.CreatedAt,
            user.LastSeen,
            user.TotalRevenue,
            user.TotalOrders,
            user.PendingOrders,
            user.ReviewCount,
            user.Rating,
            user.ListingBanned,
            user.ListingBanUntil,
            user.ListingLimit,
            user.ListingLimitCount,
            user.ListingLimitResetAt
        );

        return Ok(dto);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<SellerProfileDto>> GetById(Guid id, CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null || !user.IsActive) return NotFound();

        var dto = new SellerProfileDto(
            user.Id,
            user.DisplayName ?? "Seller",
            user.AvatarUrl,
            user.Rating,
            user.ReviewCount,
            user.TotalOrders,
            user.City,
            user.CreatedAt
        );

        return Ok(dto);
    }

    [HttpPut("me")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _users.GetByIdAsync(uid.Value, ct);
        if (user is null) return NotFound();

        var changed = false;

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
        {
            var dn = req.DisplayName.Trim();
            if (!string.Equals(user.DisplayName, dn, StringComparison.Ordinal))
            {
                user.DisplayName = dn;
                changed = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(req.Phone))
        {
            var ph = req.Phone.Trim();
            if (!string.Equals(user.Phone, ph, StringComparison.Ordinal))
            {
                user.Phone = ph;
                changed = true;
            }
        }

        if (req.City != null)
        {
            var city = string.IsNullOrWhiteSpace(req.City) ? null : req.City.Trim();
            if (!string.Equals(user.City, city, StringComparison.Ordinal))
            {
                user.City = city;
                changed = true;
            }
        }

        if (req.Avatar != null)
        {
            var avatar = string.IsNullOrWhiteSpace(req.Avatar) ? null : req.Avatar.Trim();
            if (avatar != null && !StoredImageUrlValidator.IsAllowed(avatar, _config))
                return BadRequest("Avatar URL is invalid.");
            if (!string.Equals(user.AvatarUrl, avatar, StringComparison.Ordinal))
            {
                user.AvatarUrl = avatar;
                changed = true;
            }
        }

        if (changed)
        {
            await _users.UpdateAsync(user, ct);
            await _uow.SaveChangesAsync(ct);
        }

        return Ok(user.ToDto());
    }

    [HttpPost("me/deactivate")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public Task<IActionResult> DeactivateMe(CancellationToken ct)
    {
        return DeactivateCurrentUserAsync(ct);
    }

    [HttpDelete("me")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public Task<IActionResult> DeleteMe(CancellationToken ct)
    {
        return DeactivateCurrentUserAsync(ct);
    }

    [HttpPost("me/deletion-request")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    [EnableRateLimiting("write")]
    public async Task<ActionResult<AccountDeletionRequestResponse>> RequestAccountDeletion(
        [FromBody] AccountDeletionRequest? req,
        CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _users.GetByIdAsync(uid.Value, ct);
        if (user is null) return NotFound();

        var now = DateTimeOffset.UtcNow;
        var reason = string.IsNullOrWhiteSpace(req?.Reason) ? null : req.Reason.Trim();
        if (reason is { Length: > 500 })
            return BadRequest(ApiProblemDetails.Validation("Reason must be 500 characters or fewer.", nameof(req.Reason)));

        user.AccountDeletionRequestedAt ??= now;
        user.AccountDeletionReason = reason;

        if (user.IsActive)
        {
            user.Deactivate(now);
            await _refreshTokens.RevokeAllForUserAsync(user.Id, now, ct);
        }

        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var requestedAt = user.AccountDeletionRequestedAt ?? now;
        var deletionClockStartedAt = user.DeactivatedAt ?? requestedAt;
        var graceDays = Math.Clamp(_config.GetValue<int?>("AccountDeletion:GraceDays") ?? 90, 1, 365);
        return Ok(new AccountDeletionRequestResponse(
            "requested",
            requestedAt,
            deletionClockStartedAt.AddDays(graceDays),
            reason));
    }

    private async Task<IActionResult> DeactivateCurrentUserAsync(CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _users.GetByIdAsync(uid.Value, ct);
        if (user is null) return NotFound();
        if (!user.IsActive) return NoContent();

        var now = DateTimeOffset.UtcNow;
        user.Deactivate(now);
        await _refreshTokens.RevokeAllForUserAsync(user.Id, now, ct);
        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return NoContent();
    }
}

public sealed record AccountDeletionRequest(string? Reason);

public sealed record AccountDeletionRequestResponse(
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset ScheduledDeletionAt,
    string? Reason);
