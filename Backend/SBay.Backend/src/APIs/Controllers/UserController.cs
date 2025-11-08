using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SBay.Backend.APIs.Records;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UserController : ControllerBase
{
    private readonly EfDataProvider _data;
    private readonly EfDbContext _db;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;
    private readonly ICurrentUserResolver _userResolver;

    public UserController(
        EfDataProvider data,
        EfDbContext db,
        IOptions<JwtOptions> jwtOptions,
        IPasswordHasher<User> hasher, ICurrentUserResolver userResolver)
    {
        _data = data;
        _db = db;
        _hasher = hasher;
        _jwt = jwtOptions.Value;
        _userResolver = userResolver;
    }
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe(CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == uid.Value, ct);
        if (user is null) return NotFound();

        var listingsCount = await _db.Set<Listing>().AsNoTracking().CountAsync(l => l.SellerId == uid.Value, ct);
        // TODO: enable when chat feature is ready
        // var chatsCount = await _db.Set<Chat>().AsNoTracking().CountAsync(c => c.BuyerID == uid.Value || c.SellerID == uid.Value, ct);
        // var unreadMessagesCount = await _db.Set<Message>().AsNoTracking().CountAsync(m => m.ReceiverID == uid.Value && !m.IsRead, ct);

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

    // PUT: /api/users/me
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var uid = await _userResolver.GetUserIdAsync(User, ct);
        if (!uid.HasValue || uid.Value == Guid.Empty) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == uid.Value, ct);
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
            await _db.SaveChangesAsync(ct);

        return Ok(user.ToDto());
    }
}

