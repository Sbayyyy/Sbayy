using System.Security.Claims;
using SBay.Domain.Database;

namespace SBay.Domain.Entities;

public class CurrentUserResolver : ICurrentUserResolver
{
    private readonly IUserRepository _users;
    public CurrentUserResolver(IUserRepository users) => _users = users;

    public async Task<Guid?> GetUserIdAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var sub = user.FindFirstValue("sub");
        if (Guid.TryParse(sub, out var id))
            return id;

        var ext = user.FindFirstValue("user_id");
        if (!string.IsNullOrWhiteSpace(ext))
            return (await _users.GetByExternalIdAsync(ext, cancellationToken))?.Id;

        return null;
    }
}
