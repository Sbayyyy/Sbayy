
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IImageRepository : IReadStore<ListingImage>, IWriteStore<ListingImage>
    {
        Task<IReadOnlyList<ListingImage>> GetByListingId(Guid listingID, CancellationToken ct);
        Task<IReadOnlyList<ListingImage>> SearchAsync(ImageQuery listingQuery, CancellationToken ct);
    }
}