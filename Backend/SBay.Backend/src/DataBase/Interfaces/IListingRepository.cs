
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IListingRepository : IReadStore<Entities.Listing>, IWriteStore<Entities.Listing>
    {
        Task<IReadOnlyList<Entities.Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct);
        Task<Entities.Listing?> GetByIdForManagementAsync(Guid id, CancellationToken ct);
        Task<IReadOnlyList<Entities.Listing>> GetBySellerForManagementAsync(Guid sellerId, CancellationToken ct);
        Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery listingQuery, CancellationToken ct);
        Task<IReadOnlyList<Listing>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct);
        Task<int> CountBySellerAsync(Guid sellerId, CancellationToken ct);
        Task<bool> TryReserveStockAsync(IReadOnlyDictionary<Guid, int> quantitiesByListingId, CancellationToken ct);
        Task ReleaseStockAsync(IReadOnlyDictionary<Guid, int> quantitiesByListingId, CancellationToken ct);
        Task ReplaceImagesAsync(Listing entity, CancellationToken ct);
        Task SoftDeleteAsync(Guid id, CancellationToken ct);
    }
}
