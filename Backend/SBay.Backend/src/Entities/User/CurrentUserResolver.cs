using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;

namespace SBay.Domain.Entities;

public class CurrentUserResolver : ICurrentUserResolver
{
    private readonly EfDbContext _dbContext;
    public CurrentUserResolver(EfDbContext dbContext) => _dbContext = dbContext;

    public async Task<Guid?> GetUserIdAsync(ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var sub = user.FindFirstValue("sub");
        if (Guid.TryParse(sub, out var id))
            return id;

        var ext = user.FindFirstValue("user_id");
        if (!string.IsNullOrWhiteSpace(ext))
        {
            
            var internalId = await _dbContext.Users.AsNoTracking()
                .Where(u => u.ExternalId == ext)
                .Select(u => u.Id)
                .FirstOrDefaultAsync(cancellationToken);

            return internalId == Guid.Empty ? (Guid?)null : internalId;
        }

        return null;
    }
}