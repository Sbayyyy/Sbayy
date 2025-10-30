using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
namespace SBay.Domain.Authentication
{
    public sealed class FirebaseAuthenticator : IAuthenticator
    {
        private readonly string _projectId;
        private readonly string _issuer;
        private readonly string _audience;
        private readonly IConfigurationManager<OpenIdConnectConfiguration> _configManager;

        private const string FirebaseJwksUrl = "#ADD HERE";

        public FirebaseAuthenticator(string projectId, TimeSpan refreshInterval)
        {
            _projectId = projectId;
            _issuer = $"https://securetoken.google.com/{projectId}";
            _audience = projectId;
            _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
                FirebaseJwksUrl,
                new OpenIdConnectConfigurationRetriever(),
                new HttpDocumentRetriever { RequireHttps = true });
        }
        public bool CanHandle(string token)
        {
            var iss = JwtPeek.TryReadIssuer(token);
            return string.Equals(iss, _issuer, StringComparison.OrdinalIgnoreCase);
        }

        public async Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken cancellationToken)
        {
            var cfg = await _configManager.GetConfigurationAsync(cancellationToken);
            var tvp = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
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
                var id = principal.FindFirst("user_id")?.Value;
                if (id != null && principal.FindFirst("sub") is null)
                {
                    var idNew = new ClaimsIdentity();
                    idNew.AddClaim(new Claim("sub", id));
                    principal.AddIdentity(idNew);
                }
                return principal;
            }
            catch
            {
                //TODO: FIX ERROR HANDLING
                return null;
            }
        }
    }
}