using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Messaging;

public sealed class UserOwnership : IUserOwnership
{
    private readonly IListingRepository _listings;
    public UserOwnership(IListingRepository listings) => _listings = listings;

    public async Task<bool> IsOwnerOfListingAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        var listing = await _listings.GetByIdAsync(listingId, ct);
        return listing is not null && listing.SellerId == userId;
    }
}
