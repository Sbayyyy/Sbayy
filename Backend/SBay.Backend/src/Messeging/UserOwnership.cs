using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Messaging;

public sealed class UserOwnership : IUserOwnership
{
    private readonly EfDbContext _db;
    public UserOwnership(EfDbContext db) => _db = db;

    public async Task<bool> IsOwnerOfListingAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        var sellerId = await _db.Set<Listing>()
            .AsNoTracking()
            .Where(l => l.Id == listingId)
            .Select(l => l.SellerId)
            .FirstOrDefaultAsync(ct);

        return sellerId != Guid.Empty && sellerId == userId;
    }
}