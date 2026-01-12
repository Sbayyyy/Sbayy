using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Domain.Database;
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
    [Authorize]
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
            user.Role,
            user.IsSeller,
            user.CreatedAt,
            user.LastSeen
        );

        return Ok(dto);
    }

    [HttpPut("me")]
    [Authorize]
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

        if (changed)
        {
            await _users.UpdateAsync(user, ct);
            await _uow.SaveChangesAsync(ct);
        }

        return Ok(user.ToDto());
    }
}
