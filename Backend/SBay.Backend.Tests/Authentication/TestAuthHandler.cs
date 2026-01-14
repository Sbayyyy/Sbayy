using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SBay.Domain.Authentication;

public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestAuth";
    public static Guid SellerId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        ISystemClock clock) : base(options, logger, encoder, clock) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var header) ||
            !AuthenticationHeaderValue.TryParse(header!, out var authHeader) ||
            !string.Equals(authHeader.Scheme, SchemeName, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var role = Request.Headers.TryGetValue("X-Test-Role", out var roleHeader)
            ? roleHeader.ToString()
            : "seller";

        var isSeller = Request.Headers.TryGetValue("X-Test-IsSeller", out var sellerHeader)
            && bool.TryParse(sellerHeader.ToString(), out var parsedSeller)
            && parsedSeller;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, SellerId.ToString()),
            new Claim("sub", SellerId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim("is_seller", isSeller.ToString().ToLowerInvariant())
        };

        if (Request.Headers.TryGetValue("X-Test-Scopes", out var scopesHeader) &&
            !string.IsNullOrWhiteSpace(scopesHeader))
        {
            claims.Add(new Claim(Scopes.ClaimType, scopesHeader.ToString()));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
