using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SBay.Backend.APIs.Records;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

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

    // PUT: /api/users/me
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        /*TODO:
         Multiple concerns with the update logic.

Redundant persistence calls? Lines 56-57 call both _data.Users.UpdateAsync and _data.Uow.SaveChangesAsync. Verify whether UpdateAsync already persists changes. If it does, SaveChangesAsync is redundant; if it doesn't, the naming is misleading.

Missing input validation. The method only trims input but doesn't validate:

Maximum length constraints (e.g., DisplayName and Phone likely have DB column limits)
Format validation for Phone (e.g., regex pattern)
Content validation (e.g., prevent control characters, XSS)
Unnecessary updates. The method always calls UpdateAsync even if no fields changed, causing unnecessary DB writes and potential concurrency conflicts.

Mixed data access. Line 48 uses _db.Users directly while line 56 uses _data.Users.UpdateAsync, mixing EF context and repository patterns inconsistently.
         */
        var userId = await _userResolver.GetUserIdAsync(User, ct);
        if (userId == Guid.Empty) return Unauthorized();
        if (userId==null) return Unauthorized("User not found");
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.DisplayName))
            user.DisplayName = req.DisplayName.Trim();
        if (!string.IsNullOrWhiteSpace(req.Phone))
            user.Phone = req.Phone.Trim();

        await _data.Users.UpdateAsync(user, ct);
        await _data.Uow.SaveChangesAsync(ct);

        return Ok(user.ToDto());
    }
}