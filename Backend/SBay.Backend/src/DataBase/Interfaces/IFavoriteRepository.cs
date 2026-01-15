using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public interface IFavoriteRepository
{
    Task<IReadOnlyList<FavoriteListing>> GetByUserAsync(Guid userId, CancellationToken ct);
    Task<bool> ExistsAsync(Guid userId, Guid listingId, CancellationToken ct);
    Task AddAsync(FavoriteListing entity, CancellationToken ct);
    Task RemoveAsync(Guid userId, Guid listingId, CancellationToken ct);
}
