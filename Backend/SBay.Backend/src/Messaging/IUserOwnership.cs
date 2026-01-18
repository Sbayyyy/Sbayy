namespace SBay.Backend.Messaging;

public interface IUserOwnership
{
    Task<bool> IsOwnerOfListingAsync(Guid userId, Guid listingId, CancellationToken ct);

}