using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using SBay.Domain.Authentication;
namespace SBay.Domain.Authentication
{
    public sealed class OidcAuthenticator : IAuthenticator
    {
        private readonly string _authority;
        private readonly string? _audience;
        private readonly IConfigurationManager<OpenIdConnectConfiguration> _configManager;

        public OidcAuthenticator(string authority, string? audience = null)
        {
            _authority = authority.TrimEnd('/');
            _audience = audience;
            var metadata = $"{_authority}/.well-known/openid-configuration";
            _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                metadata,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever { RequireHttps = true }
            );
        }
        public bool CanHandle(string token)
        {
            var iss = JwtPeek.TryReadIssuer(token);
            return iss != null && iss.StartsWith(_authority, StringComparison.OrdinalIgnoreCase);
        }

        public async Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken cancellationToken)
        {
            var cfg = await _configManager.GetConfigurationAsync(cancellationToken);
            var tvp = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuers = new[] { cfg.Issuer, _authority },
                ValidateAudience = _audience != null,
                ValidAudience = _audience,
                ValidateLifetime = true,
                RequireSignedTokens = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = (SecurityKey)cfg.SigningKeys
            };
            var handler = new JwtSecurityTokenHandler();
            try
            {
                var principal = handler.ValidateToken(token, tvp, out _);
                return principal;
            }
            catch
            {
                //TODO: Fix Error Handling
                return null;
            }
        }
    }
}
