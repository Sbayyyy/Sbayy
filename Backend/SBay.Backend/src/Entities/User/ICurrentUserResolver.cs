using System.Security.Claims;

namespace SBay.Domain.Entities;

public interface ICurrentUserResolver
{
    Task<Guid?> GetUserIdAsync(ClaimsPrincipal user, CancellationToken cancellationToken);
}