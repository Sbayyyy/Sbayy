using System.IdentityModel.Tokens.Jwt;
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SBay.Backend.Authentication;
using SBay.Backend.Utils;
using SBay.Backend.Services;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using LoginRequest = SBay.Backend.APIs.Records.LoginRequest;
using RegisterRequest=SBay.Backend.APIs.Records.RegisterRequest;
using UserDto=SBay.Backend.APIs.Records.UserDto;
using AuthResponse= SBay.Backend.APIs.Records.Responses.AuthResponse;
using ChangePasswordRequest = SBay.Backend.APIs.Records.ChangePasswordRequest;
using RefreshTokenRequest = SBay.Backend.APIs.Records.RefreshTokenRequest;
using LogoutRequest = SBay.Backend.APIs.Records.LogoutRequest;
using VerifyEmailRequest = SBay.Backend.APIs.Records.Requests.VerifyEmailRequest;
using ForgotPasswordRequest = SBay.Backend.APIs.Records.Requests.ForgotPasswordRequest;
using ResetPasswordRequest = SBay.Backend.APIs.Records.Requests.ResetPasswordRequest;
using GoogleAuthRequest = SBay.Backend.APIs.Records.Requests.GoogleAuthRequest;
using GoogleMobileCallbackRequest = SBay.Backend.APIs.Records.Requests.GoogleMobileCallbackRequest;

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
    private static readonly TimeSpan GoogleOAuthStateLifetime = TimeSpan.FromMinutes(10);
    private const string GoogleOAuthAuthorizeEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const int MaxLoginAttempts = 10;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _hasher;
    private readonly JwtOptions _jwt;
    private readonly IConfiguration _config;
    private readonly IEmailSender _emailSender;
    private readonly IPasswordResetEmailQueue _passwordResetEmailQueue;
    private readonly IGoogleTokenVerifier _googleTokenVerifier;
    private readonly IGoogleOAuthCodeExchanger _googleOAuthCodeExchanger;
    private readonly IStringLocalizer<BackendMessages> _l;

    public AuthController(IUserRepository users, IRefreshTokenRepository refreshTokens, IUnitOfWork uow, IPasswordHasher<User> hasher, IOptions<JwtOptions> jwt, IConfiguration config, IEmailSender emailSender, IPasswordResetEmailQueue passwordResetEmailQueue, IGoogleTokenVerifier googleTokenVerifier, IGoogleOAuthCodeExchanger googleOAuthCodeExchanger, IStringLocalizer<BackendMessages> localizer)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _uow = uow;
        _hasher = hasher;
        _jwt = jwt.Value;
        _config = config;
        _emailSender = emailSender;
        _passwordResetEmailQueue = passwordResetEmailQueue;
        _googleTokenVerifier = googleTokenVerifier;
        _googleOAuthCodeExchanger = googleOAuthCodeExchanger;
        _l = localizer;
    }

    
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("registration")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.Email) || string.IsNullOrWhiteSpace(req?.Password))
            return BadRequest(_l["Auth_EmailPasswordRequired"].Value);
        if (!EmailValidator.TryNormalize(req.Email, out var email))
            return BadRequest(_l["Auth_EmailInvalid"].Value);
        if (!IsStrongPassword(req.Password))
            return BadRequest(_l["Auth_PasswordWeak"].Value);

        var exists = await _users.EmailExistsAsync(email, ct);
        if (exists) return Conflict(_l["Auth_RegistrationConflict"].Value);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            EmailVerified = false,
            DisplayName = (req.DisplayName ?? req.Name)?.Trim(),
            Phone = req.Phone?.Trim(),
            City = req.City?.Trim(),
            Role = "user",
            IsSeller = true,
            CreatedAt = DateTime.UtcNow
        };

        ApplyDefaultListingLimit(user);
        user.PasswordHash = _hasher.HashPassword(user, req.Password);
        var verificationToken = CreateVerificationToken(user);

        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);
        try
        {
            await SendVerificationEmailAsync(user, verificationToken, ct);
        }
        catch
        {
            await _users.RemoveAsync(user, ct);
            await _uow.SaveChangesAsync(ct);
            return StatusCode(StatusCodes.Status500InternalServerError, _l["Auth_VerificationEmailFailed"].Value);
        }

        return CreatedAtAction(nameof(GetMe), new { }, new
        {
            user = user.ToDto(),
            emailVerificationRequired = true
        });
    }

    
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var email = (req?.Email ?? string.Empty).Trim().ToLowerInvariant();
        var pwd   = (req?.Password ?? string.Empty);

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(pwd))
            return BadRequest(_l["Auth_EmailPasswordRequired"].Value);
        if (!EmailValidator.IsValid(email) || pwd.Length > 128)
            return Unauthorized(_l["Auth_InvalidCredentials"].Value);
        var attemptKey = $"{email}:{HttpContext.Connection.RemoteIpAddress}";
        if (IsLoginRateLimited(attemptKey))
            return StatusCode(StatusCodes.Status429TooManyRequests, _l["Auth_TooManyAttempts"].Value);

        var user = await _users.GetByEmailAsync(email, ct);
        if (user is null)
        {
            DummyHasher.VerifyHashedPassword(DummyUser, DummyPasswordHash, pwd);
            TrackFailedLogin(attemptKey);
            return Unauthorized(_l["Auth_InvalidCredentials"].Value);
        }

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, pwd);
        if (result == PasswordVerificationResult.Failed)
        {
            TrackFailedLogin(attemptKey);
            return Unauthorized(_l["Auth_InvalidCredentials"].Value);
        }

        if (!user.IsActive)
            return StatusCode(StatusCodes.Status403Forbidden, _l["Auth_AccountInactive"].Value);
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _hasher.HashPassword(user, pwd);
            await _users.UpdateAsync(user, ct);
            await _uow.SaveChangesAsync(ct);
        }

        LoginAttempts.TryRemove(attemptKey, out _);
        return Ok(await CreateAuthResponseAsync(user, ct));
    }

    [HttpPost("google")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Google([FromBody] GoogleAuthRequest? req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.IdToken))
            return BadRequest(_l["Auth_GoogleTokenRequired"].Value);

        VerifiedGoogleToken? googleToken;
        try
        {
            googleToken = await _googleTokenVerifier.VerifyIdTokenAsync(req.IdToken, ct);
        }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleSignInNotConfigured"].Value);
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleUnavailable"].Value);
        }

        var signIn = await SignInWithGoogleTokenAsync(googleToken, ct);
        return ToGoogleActionResult(signIn);
    }

    [HttpGet("google/mobile/start")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public IActionResult GoogleMobileStart([FromQuery] string? redirectUri)
    {
        if (!TryNormalizeGoogleMobileRedirectUri(redirectUri, out var mobileRedirectUri))
            return BadRequest(_l["Auth_GoogleRedirectInvalid"].Value);

        var clientId = GoogleOAuthCodeExchanger.GetOAuthClientId(_config);
        if (string.IsNullOrWhiteSpace(clientId))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleSignInNotConfigured"].Value);

        var callbackUrl = GetGoogleMobileCallbackUrl();
        if (string.IsNullOrWhiteSpace(callbackUrl))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleCallbackNotConfigured"].Value);

        var state = CreateGoogleMobileState(mobileRedirectUri);
        var authorizationUrl = QueryHelpers.AddQueryString(
            GoogleOAuthAuthorizeEndpoint,
            new Dictionary<string, string?>
            {
                ["client_id"] = clientId,
                ["redirect_uri"] = callbackUrl,
                ["response_type"] = "code",
                ["scope"] = "openid email profile",
                ["access_type"] = "offline",
                ["prompt"] = "select_account",
                ["state"] = state
            });

        return Redirect(authorizationUrl);
    }

    [HttpGet("google/mobile/callback")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GoogleMobileCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? error,
        CancellationToken ct)
    {
        if (!TryReadGoogleMobileState(state, out var mobileRedirectUri))
            return BadRequest(_l["Auth_GoogleStateInvalid"].Value);

        if (!string.IsNullOrWhiteSpace(error))
            return RedirectWithGoogleMobileError(mobileRedirectUri, error);
        if (string.IsNullOrWhiteSpace(code))
            return RedirectWithGoogleMobileError(mobileRedirectUri, _l["Auth_GoogleAuthorizationCodeMissing"].Value);

        VerifiedGoogleToken? googleToken;
        try
        {
            googleToken = await ExchangeGoogleCodeAsync(code, GetGoogleMobileCallbackUrl(), ct);
        }
        catch (InvalidOperationException)
        {
            return RedirectWithGoogleMobileError(mobileRedirectUri, _l["Auth_GoogleSignInNotConfigured"].Value);
        }
        catch (HttpRequestException)
        {
            return RedirectWithGoogleMobileError(mobileRedirectUri, _l["Auth_GoogleUnavailable"].Value);
        }

        var signIn = await SignInWithGoogleTokenAsync(googleToken, ct);
        return signIn.Succeeded
            ? RedirectWithGoogleMobileAuth(mobileRedirectUri, signIn.Auth!)
            : RedirectWithGoogleMobileError(mobileRedirectUri, signIn.Error ?? _l["Auth_GoogleContinueFailed"].Value);
    }

    [HttpPost("google/mobile/callback")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GoogleMobileCallback([FromBody] GoogleMobileCallbackRequest? req, CancellationToken ct)
    {
        if (req is null)
            return BadRequest(_l["Auth_GoogleCredentialsRequired"].Value);

        VerifiedGoogleToken? googleToken = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(req.IdToken))
            {
                googleToken = await VerifyGoogleIdTokenAsync(req.IdToken, ct);
            }
            else if (!string.IsNullOrWhiteSpace(req.Code) && !string.IsNullOrWhiteSpace(req.RedirectUri))
            {
                if (!TryNormalizeGoogleMobileRedirectUri(req.RedirectUri, out var mobileRedirectUri))
                    return BadRequest(_l["Auth_GoogleRedirectInvalid"].Value);

                googleToken = await ExchangeGoogleCodeAsync(req.Code, mobileRedirectUri, ct);
            }
        }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleSignInNotConfigured"].Value);
        }
        catch (HttpRequestException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, _l["Auth_GoogleUnavailable"].Value);
        }

        var signIn = await SignInWithGoogleTokenAsync(googleToken, ct);
        return ToGoogleActionResult(signIn);
    }

    private async Task<GoogleSignInResult> SignInWithGoogleTokenAsync(VerifiedGoogleToken? googleToken, CancellationToken ct)
    {
        if (googleToken is null)
            return GoogleSignInResult.Fail(StatusCodes.Status401Unauthorized, _l["Auth_GoogleInvalidToken"].Value);
        if (!googleToken.EmailVerified || !EmailValidator.TryNormalize(googleToken.Email, out var email))
            return GoogleSignInResult.Fail(StatusCodes.Status401Unauthorized, _l["Auth_GoogleEmailUnverified"].Value);

        var externalId = CreateProviderExternalId("google", googleToken.Subject);
        var user = await _users.GetByExternalIdAsync(externalId, ct);
        if (user is null)
        {
            user = await _users.GetByEmailAsync(email, ct);
            if (user is null)
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    EmailVerified = true,
                    EmailVerifiedAt = DateTimeOffset.UtcNow,
                    DisplayName = NormalizeDisplayName(googleToken.Name) ?? email.Split('@')[0],
                    AvatarUrl = NormalizeAvatarUrl(googleToken.Picture),
                    ExternalId = externalId,
                    Role = "user",
                    IsSeller = true,
                    CreatedAt = DateTime.UtcNow
                };
                ApplyDefaultListingLimit(user);
                user.PasswordHash = CreateUnavailablePasswordHash(user);
                // User persistence is committed by CreateAuthResponseAsync through IssueRefreshTokenAsync.
                await _users.AddAsync(user, ct);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(user.ExternalId) &&
                    !string.Equals(user.ExternalId, externalId, StringComparison.Ordinal))
                {
                    return GoogleSignInResult.Fail(
                        StatusCodes.Status409Conflict,
                        _l["Auth_GoogleProviderConflict"].Value);
                }

                user.ExternalId = externalId;
                user.EmailVerified = true;
                user.EmailVerifiedAt ??= DateTimeOffset.UtcNow;
                user.EmailVerificationTokenHash = null;
                user.EmailVerificationExpiresAt = null;
                user.DisplayName ??= NormalizeDisplayName(googleToken.Name);
                user.AvatarUrl ??= NormalizeAvatarUrl(googleToken.Picture);
                // User updates are committed by CreateAuthResponseAsync through IssueRefreshTokenAsync.
                await _users.UpdateAsync(user, ct);
            }
        }

        if (!user.IsActive)
            return GoogleSignInResult.Fail(StatusCodes.Status403Forbidden, _l["Auth_AccountInactive"].Value);

        return GoogleSignInResult.Success(await CreateAuthResponseAsync(user, ct));
    }

    private async Task<VerifiedGoogleToken?> VerifyGoogleIdTokenAsync(string idToken, CancellationToken ct)
    {
        return await _googleTokenVerifier.VerifyIdTokenAsync(idToken, ct);
    }

    private async Task<VerifiedGoogleToken?> ExchangeGoogleCodeAsync(string code, string redirectUri, CancellationToken ct)
    {
        return await _googleOAuthCodeExchanger.ExchangeCodeAsync(code, redirectUri, ct);
    }

    private IActionResult ToGoogleActionResult(GoogleSignInResult result)
    {
        return result.Succeeded
            ? Ok(result.Auth)
            : StatusCode(result.StatusCode, result.Error);
    }

    private IActionResult RedirectWithGoogleMobileAuth(string mobileRedirectUri, AuthResponse auth)
    {
        return Redirect(QueryHelpers.AddQueryString(
            mobileRedirectUri,
            new Dictionary<string, string?>
            {
                ["token"] = auth.Token,
                ["refreshToken"] = auth.RefreshToken,
                ["refreshTokenExpiresAt"] = auth.RefreshTokenExpiresAt?.ToString("O")
            }));
    }

    private IActionResult RedirectWithGoogleMobileError(string mobileRedirectUri, string error)
    {
        return Redirect(QueryHelpers.AddQueryString(
            mobileRedirectUri,
            new Dictionary<string, string?>
            {
                ["error"] = error
            }));
    }

    private string CreateGoogleMobileState(string mobileRedirectUri)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(GoogleOAuthStateLifetime).ToUnixTimeSeconds();
        var nonce = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16));
        var encodedRedirectUri = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(mobileRedirectUri));
        var payload = $"{expiresAt}.{nonce}.{encodedRedirectUri}";
        return $"{payload}.{SignGoogleMobileState(payload)}";
    }

    private bool TryReadGoogleMobileState(string? state, out string mobileRedirectUri)
    {
        mobileRedirectUri = string.Empty;
        if (string.IsNullOrWhiteSpace(state))
            return false;

        var parts = state.Split('.');
        if (parts.Length != 4)
            return false;

        var payload = $"{parts[0]}.{parts[1]}.{parts[2]}";
        try
        {
            var expected = WebEncoders.Base64UrlDecode(SignGoogleMobileState(payload));
            var actual = WebEncoders.Base64UrlDecode(parts[3]);
            if (actual.Length != expected.Length || !CryptographicOperations.FixedTimeEquals(actual, expected))
                return false;

            if (!long.TryParse(parts[0], out var expiresAt) ||
                expiresAt < DateTimeOffset.UtcNow.ToUnixTimeSeconds())
            {
                return false;
            }

            var redirectUri = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(parts[2]));
            return TryNormalizeGoogleMobileRedirectUri(redirectUri, out mobileRedirectUri);
        }
        catch (FormatException)
        {
            return false;
        }
        catch (ArgumentException)
        {
            return false;
        }
    }

    private string SignGoogleMobileState(string payload)
    {
        var key = SHA256.HashData(Encoding.UTF8.GetBytes(_jwt.Secret));
        using var hmac = new HMACSHA256(key);
        return WebEncoders.Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private bool TryNormalizeGoogleMobileRedirectUri(string? value, out string mobileRedirectUri)
    {
        mobileRedirectUri = string.Empty;
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed) ||
            !Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var normalized = uri.ToString().TrimEnd('/');
        var allowed = GetConfiguredGoogleMobileRedirectUris();
        if (!allowed.Contains(normalized, StringComparer.OrdinalIgnoreCase))
            return false;

        mobileRedirectUri = normalized;
        return true;
    }

    private string[] GetConfiguredGoogleMobileRedirectUris()
    {
        var configured = _config
            .GetSection("Authentication:Google:MobileRedirectUris")
            .Get<string[]>() ?? Array.Empty<string>();

        var fallbacks = new[]
        {
            _config["Authentication:Google:MobileRedirectUri"],
            _config["Google:MobileRedirectUri"],
            _config["GOOGLE_MOBILE_REDIRECT_URI"],
            _config["GOOGLE_MOBILE_REDIRECT_URI_ALT"],
            "sbay://auth/google",
            "sbay:///auth/google"
        };

        return configured
            .Concat(fallbacks)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim().TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private string GetGoogleMobileCallbackUrl()
    {
        var configured = _config["Authentication:Google:MobileCallbackUrl"]
            ?? _config["Google:MobileCallbackUrl"]
            ?? _config["GOOGLE_MOBILE_CALLBACK_URL"];
        if (Uri.TryCreate(configured, UriKind.Absolute, out var configuredUri))
            return configuredUri.ToString().TrimEnd('/');

        var publicBaseUrl = _config["Backend:PublicBaseUrl"]
            ?? _config["Api:PublicBaseUrl"]
            ?? _config["App:PublicBaseUrl"]
            ?? _config["PUBLIC_API_URL"]
            ?? _config["API_PUBLIC_BASE_URL"];
        if (Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var publicBaseUri))
            return $"{publicBaseUri.ToString().TrimEnd('/')}/api/auth/google/mobile/callback";

        return $"{Request.Scheme}://{Request.Host.ToUriComponent()}/api/auth/google/mobile/callback";
    }

    [HttpPost("verify-email")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Token))
            return BadRequest(_l["Auth_VerificationTokenRequired"].Value);

        var tokenHash = HashToken(request.Token);
        var user = await _users.GetByEmailVerificationTokenHashAsync(tokenHash, ct);

        if (user is null ||
            user.EmailVerificationExpiresAt is null ||
            user.EmailVerificationExpiresAt <= DateTimeOffset.UtcNow)
        {
            return BadRequest(_l["Auth_VerificationLinkExpired"].Value);
        }

        if (user.EmailVerified)
        {
            return Ok(new
            {
                Message = _l["Auth_EmailAlreadyVerified"].Value
            });
        }

        user.EmailVerified = true;
        user.EmailVerifiedAt ??= DateTimeOffset.UtcNow;
        user.EmailVerificationTokenHash = null;
        user.EmailVerificationExpiresAt = null;

        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        return Ok(new
        {
            Message = _l["Auth_EmailVerifiedSuccessfully"].Value
        });
    }

    [HttpPost("request-email-verification")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestEmailVerification(CancellationToken ct)
    {
        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();

        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        if (!user.IsActive) return Forbid();

        if (user.EmailVerified)
        {
            return Ok(new
            {
                Message = _l["Auth_AlreadyVerified"].Value,
                EmailVerificationRequired = false
            });
        }

        var verificationToken = CreateVerificationToken(user);
        await _users.UpdateAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        try
        {
            await SendVerificationEmailAsync(user, verificationToken, ct);
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, _l["Auth_VerificationEmailFailedRetry"].Value);
        }

        return Ok(new
        {
            Message = _l["Auth_VerificationEmailSent"].Value,
            EmailVerificationRequired = true
        });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest? req, CancellationToken ct)
    {
        if (req is null || !EmailValidator.TryNormalize(req.Email, out var email))
            return BadRequest("Enter a valid email address.");

        var response = new
        {
            Message = "If an account exists for this email, a password reset link has been sent."
        };

        var user = await _users.GetByEmailAsync(email, ct);
        if (user is null || !user.IsActive)
        {
            await _passwordResetEmailQueue.EnqueueAsync(new PasswordResetEmailJob(null, null, IsNoOp: true), ct);
            return Ok(response);
        }

        await _passwordResetEmailQueue.EnqueueAsync(new PasswordResetEmailJob(user.Id, user.Email, IsNoOp: false), ct);

        return Ok(response);
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest? req, CancellationToken ct)
    {
        if (req is null || string.IsNullOrWhiteSpace(req.Token))
            return BadRequest("Password reset token is required.");
        if (string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest("New password is required.");
        if (!IsStrongPassword(req.NewPassword))
            return BadRequest("Password must be at least 8 characters and include uppercase, lowercase, and a number.");

        var tokenHash = HashToken(req.Token);
        var now = DateTimeOffset.UtcNow;
        var resetUser = await _users.GetByPasswordResetTokenHashAsync(tokenHash, ct);
        if (resetUser is null)
            return BadRequest("This password reset link is invalid or expired.");
        var passwordHash = _hasher.HashPassword(resetUser, req.NewPassword);

        await using var tx = await _uow.BeginTransactionAsync(ct);
        var userId = await _users.ConsumePasswordResetTokenAndUpdatePasswordAsync(tokenHash, passwordHash, now, ct);
        if (userId is null)
        {
            await tx.RollbackAsync(ct);
            return BadRequest("This password reset link is invalid or expired.");
        }

        await _refreshTokens.RevokeAllForUserAsync(userId.Value, now, ct);
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return Ok(new { Message = "Password reset successfully. You can now sign in." });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.RefreshToken))
            return Unauthorized(_l["Auth_InvalidRefreshToken"].Value);

        var now = DateTimeOffset.UtcNow;
        var existing = await _refreshTokens.GetByHashAsync(HashRefreshToken(req.RefreshToken), ct);
        if (existing is null || existing.RevokedAt is not null || existing.ExpiresAt <= now)
            return Unauthorized(_l["Auth_InvalidRefreshToken"].Value);

        var user = await _users.GetByIdAsync(existing.UserId, ct);
        if (user is null) return Unauthorized(_l["Auth_InvalidRefreshToken"].Value);
        if (!user.IsActive) return Unauthorized(_l["Auth_InvalidRefreshToken"].Value);

        var replacement = CreateRefreshToken(user.Id);
        await using var tx = await _uow.BeginTransactionAsync(ct);
        var revoked = await _refreshTokens.RevokeActiveAsync(existing.TokenHash, replacement.Entity.TokenHash, now, ct);
        if (revoked != 1)
        {
            await tx.RollbackAsync(ct);
            return Unauthorized(_l["Auth_InvalidRefreshToken"].Value);
        }

        await _refreshTokens.AddAsync(replacement.Entity, ct);
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return Ok(new AuthResponse(user.ToDto(), GenerateJwt(user))
        {
            RefreshToken = replacement.Token,
            RefreshTokenExpiresAt = replacement.Entity.ExpiresAt
        });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest req, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(req?.RefreshToken))
        {
            var existing = await _refreshTokens.GetByHashAsync(HashRefreshToken(req.RefreshToken), ct);
            if (existing is not null && existing.RevokedAt is null)
            {
                existing.RevokedAt = DateTimeOffset.UtcNow;
                await _uow.SaveChangesAsync(ct);
            }
        }

        return NoContent();
    }

    
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe(CancellationToken ct)
    {
        
        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        if (!user.IsActive) return Forbid();

        return Ok(user.ToDto());
    }

    [HttpPost("change-password")]
    [Authorize]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.CurrentPassword) || string.IsNullOrWhiteSpace(req?.NewPassword))
            return BadRequest(_l["Auth_PasswordChangeRequired"].Value);

        if (!IsStrongPassword(req.NewPassword))
            return BadRequest(_l["Auth_NewPasswordWeak"].Value);

        var sub = User.FindFirstValue("sub");
        if (!Guid.TryParse(sub, out var id)) return Unauthorized();
        var user = await _users.GetByIdAsync(id, ct);
        if (user is null) return NotFound();
        if (!user.IsActive) return Forbid();

        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized(_l["Auth_InvalidCurrentPassword"].Value);

        await using var tx = await _uow.BeginTransactionAsync(ct);
        user.PasswordHash = _hasher.HashPassword(user, req.NewPassword);
        await _users.UpdateAsync(user, ct);
        await _refreshTokens.RevokeAllForUserAsync(user.Id, DateTimeOffset.UtcNow, ct);
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return Ok();
    }

    private async Task<AuthResponse> CreateAuthResponseAsync(User user, CancellationToken ct)
    {
        var refresh = await IssueRefreshTokenAsync(user.Id, ct);
        return new AuthResponse(user.ToDto(), GenerateJwt(user))
        {
            RefreshToken = refresh.Token,
            RefreshTokenExpiresAt = refresh.ExpiresAt
        };
    }

    private void ApplyDefaultListingLimit(User user)
    {
        var defaultLimit = _config.GetValue<int?>("ListingLimits:DefaultLimit") ?? 50;
        var periodHours = _config.GetValue<int?>("ListingLimits:PeriodHours") ?? 24;
        if (defaultLimit < 0) return;

        user.ListingLimit = defaultLimit;
        user.ListingLimitCount = 0;
        user.ListingLimitResetAt = DateTimeOffset.UtcNow.AddHours(periodHours);
    }

    private string CreateUnavailablePasswordHash(User user)
    {
        var randomPassword = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        return _hasher.HashPassword(user, randomPassword);
    }

    private static string CreateProviderExternalId(string provider, string subject)
        => $"{provider.Trim().ToLowerInvariant()}:{subject.Trim()}";

    private static string? NormalizeDisplayName(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static string? NormalizeAvatarUrl(string? value)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return null;
        return Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
            ? trimmed
            : null;
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

    private async Task<(string Token, DateTimeOffset ExpiresAt)> IssueRefreshTokenAsync(Guid userId, CancellationToken ct)
    {
        var token = CreateRefreshToken(userId);
        await _refreshTokens.AddAsync(token.Entity, ct);
        await _uow.SaveChangesAsync(ct);
        return (token.Token, token.Entity.ExpiresAt);
    }

    private (string Token, RefreshToken Entity) CreateRefreshToken(Guid userId)
    {
        // Refresh tokens are opaque random secrets; only their hash is stored.
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var now = DateTimeOffset.UtcNow;
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashRefreshToken(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(_jwt.RefreshTokenDays),
            DeviceId = Request.Headers.TryGetValue("X-Device-Id", out var deviceId) ? NormalizeHeaderValue(deviceId.ToString(), 128) : null,
            UserAgent = NormalizeHeaderValue(Request.Headers.UserAgent.ToString(), 512)
        };
        return (raw, entity);
    }

    private string CreateVerificationToken(User user)
    {
        var raw = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        user.EmailVerificationTokenHash = HashToken(raw);
        user.EmailVerificationExpiresAt = DateTimeOffset.UtcNow.AddHours(
            Math.Clamp(_config.GetValue<int?>("EmailVerification:TokenHours") ?? 24, 1, 168));
        user.EmailVerifiedAt = null;
        return raw;
    }

    private async Task SendVerificationEmailAsync(User user, string token, CancellationToken ct)
    {
        var baseUrl = (_config["Frontend:BaseUrl"]
            ?? _config["Cors:AllowedOrigins:0"]
            ?? _config["FRONTEND_URL"]
            ?? "http://localhost:3000").TrimEnd('/');
        var verifyUrl = $"{baseUrl}/auth/verify-email?token={Uri.EscapeDataString(token)}";
        var subject = "Verify your SBay email";
        var text = $"Welcome to SBay. Verify your email and sign in here: {verifyUrl}";
        var html = $"""
            <p>Welcome to SBay.</p>
            <p><a href="{verifyUrl}">Verify your email and sign in</a></p>
            <p>If the button does not work, copy and paste this link:</p>
            <p>{verifyUrl}</p>
            """;
        await _emailSender.SendEmailAsync(user.Email, subject, html, text, ct);
    }

    private static string? NormalizeHeaderValue(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static string HashRefreshToken(string token)
    {
        return HashToken(token);
    }

    private static string HashToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static bool IsStrongPassword(string password)
        => password.Length <= 128 && Regex.IsMatch(password, @"(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}");

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

    private sealed record GoogleSignInResult(AuthResponse? Auth, int StatusCode, string? Error)
    {
        public bool Succeeded => Auth is not null;

        public static GoogleSignInResult Success(AuthResponse auth)
            => new(auth, StatusCodes.Status200OK, null);

        public static GoogleSignInResult Fail(int statusCode, string error)
            => new(null, statusCode, error);
    }

    private readonly record struct LoginAttempt(int Count, DateTimeOffset ResetAt);
}
