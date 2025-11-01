
namespace SBay.Domain.Database
{
    public interface IListingRepository : IReadStore<Entities.Listing>, IWriteStore<Entities.Listing>
    {
        Task<IReadOnlyList<Entities.Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct);
    }
}