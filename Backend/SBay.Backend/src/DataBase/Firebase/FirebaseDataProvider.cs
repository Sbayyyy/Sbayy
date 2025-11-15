using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirebaseDataProvider : IDataProvider
{
    public FirebaseDataProvider(
        IUserRepository users,
        IListingRepository listings,
        ICartRepository carts,
        IUnitOfWork uow)
    {
        Users = users;
        Listings = listings;
        Carts = carts;
        Uow = uow;
    }

    public IUserRepository Users { get; }
    public IListingRepository Listings { get; }
    public ICartRepository Carts { get; }
    public IUnitOfWork Uow { get; }
}
