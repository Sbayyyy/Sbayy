using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using LoginRequest = SBay.Backend.APIs.Records.LoginRequest;
using RegisterRequest=SBay.Backend.APIs.Records.RegisterRequest;
using UserDto=SBay.Backend.APIs.Records.UserDto;
using AuthResponse= SBay.Backend.APIs.Records.AuthResponse;

namespace SBay.Backend.Api.Controllers;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly EfDbContext _db;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;

    public AuthController(EfDbContext db, IPasswordHasher<User> hasher, IOptions<JwtOptions> jwt)
    {

        _db = db;
        _hasher = hasher;
        _jwt = jwt.Value;
    }

    // POST /api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.Email) || string.IsNullOrWhiteSpace(req?.Password))
            return BadRequest("Email and password are required.");

        var email = req.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AsNoTracking().AnyAsync(u => u.Email == email, ct);
        if (exists) return Conflict("Email already in use.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = req.DisplayName?.Trim(),
            Phone = req.Phone?.Trim(),
            Role = "user",
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        var dto = ToDto(user);
        var token = GenerateJwt(user);
        return CreatedAtAction(nameof(GetMe), new { }, new AuthResponse(dto, token));
    }

    // POST /api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var email = (req?.Email ?? string.Empty).Trim().ToLowerInvariant();
        var pwd   = (req?.Password ?? string.Empty);

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(pwd))
            return BadRequest("Email and password are required.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email, ct);
        if (user is null)
            return Unauthorized("Invalid email or password.");

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, pwd);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid email or password.");

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, pwd);
            _db.Users.Update(user);
            await _db.SaveChangesAsync(ct);
        }

        var dto = ToDto(user);
        var token = GenerateJwt(user);
        return Ok(new AuthResponse(dto, token));
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize(AuthenticationSchemes = "SBayJwt")]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        
        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null) return NotFound();

        return Ok(ToDto(user));
    }

    private UserDto ToDto(User u) => new(u.Id, u.Email, u.DisplayName, u.Phone, u.Role, u.CreatedAt);

    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),     // <- matches NameClaimType = "sub"
            new("role", user.Role),             // <- matches RoleClaimType = "role"
            new(JwtRegisteredClaimNames.Email, user.Email),
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