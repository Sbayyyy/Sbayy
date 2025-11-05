
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IImageRepository : IReadStore<Entities.ListingImage>, IWriteStore<Entities.ListingImage>
    {
        Task<IReadOnlyList<Entities.ListingImage>> GetByListingId(Guid listingID, CancellationToken ct);
        Task<IReadOnlyList<ListingImage>> SearchAsync(ImageQuery listingQuery, CancellationToken ct);
    }
}