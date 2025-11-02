using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.APIs.Controllers;
public record RegisterRequest(string Email, string Password, string? DisplayName, string? Phone);
public record LoginRequest(string Email, string Password);
public record UpdateProfileRequest(string? DisplayName, string? Phone);

public record UserDto(Guid Id, string Email, string? DisplayName, string? Phone, string Role, DateTime CreatedAt);
public record AuthResponse(UserDto User, string Token);
[ApiController]
[Route("api/[controller]")]
public class UsersController:ControllerBase
{
private readonly EfDataProvider _data;
    private readonly EfDbContext _db; // for convenience queries not in repo
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;

    public UsersController(
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

    // POST: /api/users/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest("Email and Password are required.");

        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AsNoTracking().AnyAsync(u => u.Email == normalizedEmail, ct);
        if (exists) return Conflict("Email already in use.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            DisplayName = req.DisplayName?.Trim(),
            Phone = req.Phone?.Trim(),
            Role = "user",
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        await _data.Users.AddAsync(user, ct);
        await _data.Uow.SaveChangesAsync(ct);

        var dto = ToDto(user);
        var token = GenerateJwt(user);
        return CreatedAtAction(nameof(GetMe), new { }, new AuthResponse(dto, token));
    }

    // POST: /api/users/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var normalizedEmail = req.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
        if (user is null)
            return Unauthorized("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid email or password.");

        // Optional: rehash if needed
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, req.Password);
            await _data.Users.UpdateAsync(user, ct);
            await _data.Uow.SaveChangesAsync(ct);
        }

        var dto = ToDto(user);
        var token = GenerateJwt(user);
        return Ok(new AuthResponse(dto, token));
    }

    // GET: /api/users/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();

        var user = await _data.Users.GetByIdAsync(userId, ct);
        if (user is null) return NotFound();

        return Ok(ToDto(user));
    }

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

    // (Optional) Admin: GET /api/users/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var user = await _data.Users.GetByIdAsync(id, ct);
        return user is null ? NotFound() : Ok(ToDto(user));
    }


    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private UserDto ToDto(User u) =>
        new(u.Id, u.Email, u.DisplayName, u.Phone, u.Role, u.CreatedAt);

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(ClaimTypes.Role, user.Role),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    
}