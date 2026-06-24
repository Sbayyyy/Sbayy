using System.Text.Json;
using System.Text.Json.Serialization;

namespace SBay.Backend.Authentication;

public interface IGoogleOAuthCodeExchanger
{
    Task<VerifiedGoogleToken?> ExchangeCodeAsync(string code, string redirectUri, CancellationToken ct);
}

public sealed class GoogleOAuthCodeExchanger : IGoogleOAuthCodeExchanger
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IGoogleTokenVerifier _tokenVerifier;

    public GoogleOAuthCodeExchanger(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IGoogleTokenVerifier tokenVerifier)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _tokenVerifier = tokenVerifier;
    }

    public async Task<VerifiedGoogleToken?> ExchangeCodeAsync(string code, string redirectUri, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(redirectUri))
            return null;

        var clientId = GetOAuthClientId(_configuration);
        var clientSecret = GetOAuthClientSecret(_configuration);
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            throw new InvalidOperationException("Google OAuth client ID and secret are not configured.");

        using var request = new HttpRequestMessage(HttpMethod.Post, TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["code"] = code.Trim(),
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = redirectUri.Trim()
            })
        };

        using var response = await _httpClientFactory
            .CreateClient(nameof(GoogleOAuthCodeExchanger))
            .SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
            return null;

        await using var body = await response.Content.ReadAsStreamAsync(ct);
        var tokenResponse = await JsonSerializer.DeserializeAsync<GoogleOAuthTokenResponse>(
            body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            ct);

        if (string.IsNullOrWhiteSpace(tokenResponse?.IdToken))
            return null;

        return await _tokenVerifier.VerifyIdTokenAsync(tokenResponse.IdToken, ct);
    }

    public static string? GetOAuthClientId(IConfiguration configuration)
    {
        return FirstConfigured(
            configuration["Authentication:Google:OAuthClientId"],
            configuration["Authentication:Google:WebClientId"],
            configuration["Google:OAuthClientId"],
            configuration["Google:WebClientId"],
            configuration["GOOGLE_OAUTH_CLIENT_ID"],
            configuration["GOOGLE_WEB_CLIENT_ID"],
            configuration["GOOGLE_CLIENT_ID"]);
    }

    public static string? GetOAuthClientSecret(IConfiguration configuration)
    {
        return FirstConfigured(
            configuration["Authentication:Google:OAuthClientSecret"],
            configuration["Authentication:Google:ClientSecret"],
            configuration["Google:OAuthClientSecret"],
            configuration["Google:ClientSecret"],
            configuration["GOOGLE_OAUTH_CLIENT_SECRET"],
            configuration["GOOGLE_WEB_CLIENT_SECRET"],
            configuration["GOOGLE_CLIENT_SECRET"]);
    }

    private static string? FirstConfigured(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private sealed class GoogleOAuthTokenResponse
    {
        [JsonPropertyName("id_token")]
        public string? IdToken { get; set; }
    }
}
