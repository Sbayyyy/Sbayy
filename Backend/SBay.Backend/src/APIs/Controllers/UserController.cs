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

public class UserController:ControllerBase
{
    private readonly EfDataProvider _data;
    private readonly EfDbContext _db; 
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;

    public UserController(
        EfDataProvider data,
        EfDbContext db,
        IOptions<JwtOptions> jwtOptions,
        IPasswordHasher<User> hasher)
    {
        _data = data;
        _db = db;
        _hasher = hasher;
        _jwt = jwtOptions.Value;
    }
    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }
    private UserDto ToDto(User u) =>
        new(u.Id, u.Email, u.DisplayName, u.Phone, u.Role, u.CreatedAt);
    // PUT: /api/users/me
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
            user.DisplayName = req.DisplayName.Trim();
        if (!string.IsNullOrWhiteSpace(req.Phone))
            user.Phone = req.Phone.Trim();

        await _data.Users.UpdateAsync(user, ct);
        await _data.Uow.SaveChangesAsync(ct);

        return Ok(ToDto(user));
    }
}