using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
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
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserResolver _userResolver;

    public UserController(
        IUserRepository users,
        IListingRepository listings,
        IUnitOfWork uow,
        ICurrentUserResolver userResolver)
    {
        _users = users;
        _listings = listings;
        _uow = uow;
        _userResolver = userResolver;
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
        if (user is null) return NotFound();

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
}
