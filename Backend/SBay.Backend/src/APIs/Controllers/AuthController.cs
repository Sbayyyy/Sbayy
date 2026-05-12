using System.IdentityModel.Tokens.Jwt;
using System.Collections.Concurrent;
using System.Net.Mail;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using LoginRequest = SBay.Backend.APIs.Records.LoginRequest;
using RegisterRequest=SBay.Backend.APIs.Records.RegisterRequest;
using UserDto=SBay.Backend.APIs.Records.UserDto;
using AuthResponse= SBay.Backend.APIs.Records.Responses.AuthResponse;
using ChangePasswordRequest = SBay.Backend.APIs.Records.ChangePasswordRequest;

namespace SBay.Backend.Api.Controllers;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, LoginAttempt> LoginAttempts = new();
    private static readonly User DummyUser = new() { Id = Guid.Empty, Email = "dummy@example.invalid" };
    private static readonly PasswordHasher<User> DummyHasher = new();
    private static readonly string DummyPasswordHash = DummyHasher.HashPassword(DummyUser, "DummyPassword1!");
    private static readonly TimeSpan LoginAttemptWindow = TimeSpan.FromMinutes(15);
    private const int MaxLoginAttempts = 10;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;
    private readonly IConfiguration _config;

    public AuthController(IUserRepository users, IUnitOfWork uow, IPasswordHasher<User> hasher, IOptions<JwtOptions> jwt, IConfiguration config)
    {
        _users = users;
        _uow = uow;
        _hasher = hasher;
        _jwt = jwt.Value;
        _config = config;
    }

    
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("registration")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.Email) || string.IsNullOrWhiteSpace(req?.Password))
            return BadRequest("Email and password are required.");
        if (!IsValidEmail(req.Email))
            return BadRequest("Email is invalid.");
        if (!IsStrongPassword(req.Password))
            return BadRequest("Password must be at least 8 characters and include uppercase, lowercase, and a number.");

        var email = req.Email.Trim().ToLowerInvariant();
        var exists = await _users.EmailExistsAsync(email, ct);
        if (exists) return Conflict("Registration could not be completed.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = (req.DisplayName ?? req.Name)?.Trim(),
            Phone = req.Phone?.Trim(),
            City = req.City?.Trim(),
            Role = "user",
            IsSeller = true,
            CreatedAt = DateTime.UtcNow
        };

        var defaultLimit = _config.GetValue<int?>("ListingLimits:DefaultLimit") ?? 50;
        var periodHours = _config.GetValue<int?>("ListingLimits:PeriodHours") ?? 24;
        if (defaultLimit >= 0)
        {
            user.ListingLimit = defaultLimit;
            user.ListingLimitCount = 0;
            user.ListingLimitResetAt = DateTimeOffset.UtcNow.AddHours(periodHours);
        }
        user.PasswordHash = _hasher.HashPassword(user, req.Password);

        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        var dto = user.ToDto();
        var token = GenerateJwt(user);
        return CreatedAtAction(nameof(GetMe), new { }, new AuthResponse(dto, token));
    }

    
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var email = (req?.Email ?? string.Empty).Trim().ToLowerInvariant();
        var pwd   = (req?.Password ?? string.Empty);

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(pwd))
            return BadRequest("Email and password are required.");
        if (!IsValidEmail(email) || pwd.Length > 128)
            return Unauthorized("Invalid email or password.");
        var attemptKey = $"{email}:{HttpContext.Connection.RemoteIpAddress}";
        if (IsLoginRateLimited(attemptKey))
            return StatusCode(StatusCodes.Status429TooManyRequests, "Too many login attempts. Please try again later.");

        var user = await _users.GetByEmailAsync(email, ct);
        if (user is null)
        {
            DummyHasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, pwd);
            TrackFailedLogin(attemptKey);
            return Unauthorized("Invalid email or password.");
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, pwd);
        if (result == PasswordVerificationResult.Failed)
        {
            TrackFailedLogin(attemptKey);
            return Unauthorized("Invalid email or password.");
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, pwd);
            await _users.UpdateAsync(user, ct);
            await _uow.SaveChangesAsync(ct);
        }

        var dto = user.ToDto();
        var token = GenerateJwt(user);
        LoginAttempts.TryRemove(attemptKey, out _);
        return Ok(new AuthResponse(dto, token));
    }

    
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        
        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        return Ok(user.ToDto());
    }

    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.CurrentPassword) || string.IsNullOrWhiteSpace(req?.NewPassword))
            return BadRequest("Current and new password are required.");

        if (!IsStrongPassword(req.NewPassword))
            return BadRequest("New password must be at least 8 characters and include uppercase, lowercase, and a number.");

        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid current password.");

        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok();
    }
    
    private string GenerateJwt(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),     
            new("role", user.Role),             
            new("is_seller", user.IsSeller.ToString().ToLowerInvariant()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };
        var scopes = Scopes.ForUser(user);
        if (scopes.Count > 0)
            claims.Add(new Claim(Scopes.ClaimType, Scopes.ToClaimValue(scopes)));

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static bool IsStrongPassword(string password)
        => password.Length <= 128 && Regex.IsMatch(password, @"(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}");

    private static bool IsValidEmail(string email)
    {
        var trimmed = email.Trim();
        if (trimmed.Length is < 3 or > 254) return false;
        try
        {
            var parsed = new MailAddress(trimmed);
            return string.Equals(parsed.Address, trimmed, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static bool IsLoginRateLimited(string key)
    {
        if (!LoginAttempts.TryGetValue(key, out var attempt))
            return false;
        if (attempt.ResetAt <= DateTimeOffset.UtcNow)
        {
            LoginAttempts.TryRemove(key, out _);
            return false;
        }
        return attempt.Count >= MaxLoginAttempts;
    }

    private static void TrackFailedLogin(string key)
    {
        var now = DateTimeOffset.UtcNow;
        LoginAttempts.AddOrUpdate(
            key,
            _ => new LoginAttempt(1, now.Add(LoginAttemptWindow)),
            (_, existing) => existing.ResetAt <= now
                ? new LoginAttempt(1, now.Add(LoginAttemptWindow))
                : existing with { Count = existing.Count + 1 });
    }

    private readonly record struct LoginAttempt(int Count, DateTimeOffset ResetAt);
}
