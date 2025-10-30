using System.Security.Claims;
namespace SBay.Domain.Authentication
{
    public interface IAuthenticator
    {
        bool CanHandle(String token);
        Task<ClaimsPrincipal?> ValidateAsync(string token, CancellationToken cancellationToken);
    }
}
