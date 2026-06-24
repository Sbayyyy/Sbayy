using Google.Apis.Auth;

namespace SBay.Backend.Authentication;

public interface IGoogleTokenVerifier
{
    Task<VerifiedGoogleToken?> VerifyIdTokenAsync(string idToken, CancellationToken ct);
}

public sealed record VerifiedGoogleToken(
    string Subject,
    string Email,
    bool EmailVerified,
    string? Name,
    string? Picture);

public sealed class GoogleTokenVerifier : IGoogleTokenVerifier
{
    private readonly IConfiguration _configuration;

    public GoogleTokenVerifier(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<VerifiedGoogleToken?> VerifyIdTokenAsync(string idToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(idToken))
            return null;

        var clientIds = GetConfiguredClientIds(_configuration);
        if (clientIds.Length == 0)
            throw new InvalidOperationException("Google client IDs are not configured.");

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                idToken.Trim(),
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = clientIds
                });

            if (string.IsNullOrWhiteSpace(payload.Subject) ||
                string.IsNullOrWhiteSpace(payload.Email))
            {
                return null;
            }

            return new VerifiedGoogleToken(
                payload.Subject,
                payload.Email,
                payload.EmailVerified,
                payload.Name,
                payload.Picture);
        }
        catch (InvalidJwtException)
        {
            return null;
        }
    }

    public static string[] GetConfiguredClientIds(IConfiguration configuration)
    {
        var configured = configuration
            .GetSection("Authentication:Google:ClientIds")
            .Get<string[]>() ?? Array.Empty<string>();

        var fallbacks = new[]
        {
            configuration["Authentication:Google:OAuthClientId"],
            configuration["Authentication:Google:WebClientId"],
            configuration["Authentication:Google:ClientId"],
            configuration["Google:OAuthClientId"],
            configuration["Google:ClientId"],
            configuration["Google:WebClientId"],
            configuration["Google:AndroidClientId"],
            configuration["GOOGLE_OAUTH_CLIENT_ID"],
            configuration["GOOGLE_CLIENT_ID"],
            configuration["GOOGLE_WEB_CLIENT_ID"],
            configuration["GOOGLE_ANDROID_CLIENT_ID"]
        };

        return configured
            .Concat(fallbacks)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }
}
