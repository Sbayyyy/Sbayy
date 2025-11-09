namespace SBay.Backend.Messaging;

public class UserOwnership:IUserOwnership
{
    public Task<bool> IsOwnerOfListingAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        return Task.FromResult(true); // TODO: check listings table
    }
}