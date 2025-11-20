
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IListingRepository : IReadStore<Entities.Listing>, IWriteStore<Entities.Listing>
    {
        Task<IReadOnlyList<Entities.Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct);
        Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery listingQuery, CancellationToken ct);
        Task<IReadOnlyList<Listing>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct);
        Task<int> CountBySellerAsync(Guid sellerId, CancellationToken ct);
    }
}
