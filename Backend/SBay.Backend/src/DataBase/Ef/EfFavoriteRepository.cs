using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public sealed class EfFavoriteRepository : IFavoriteRepository
{
    private readonly EfDbContext _db;
    public EfFavoriteRepository(EfDbContext db) => _db = db;

    public async Task<IReadOnlyList<FavoriteListing>> GetByUserAsync(Guid userId, CancellationToken ct)
    {
        return await _db.Set<FavoriteListing>()
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<bool> ExistsAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        return await _db.Set<FavoriteListing>()
            .AsNoTracking()
            .AnyAsync(f => f.UserId == userId && f.ListingId == listingId, ct);
    }

    public async Task AddAsync(FavoriteListing entity, CancellationToken ct)
    {
        await _db.Set<FavoriteListing>().AddAsync(entity, ct);
    }

    public async Task RemoveAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        var entity = await _db.Set<FavoriteListing>()
            .FirstOrDefaultAsync(f => f.UserId == userId && f.ListingId == listingId, ct);
        if (entity == null)
            return;

        _db.Set<FavoriteListing>().Remove(entity);
        await _db.SaveChangesAsync(ct);
    }
}
