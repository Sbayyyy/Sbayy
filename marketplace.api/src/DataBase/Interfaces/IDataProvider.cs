namespace SBay.Domain.Database
{
    public interface IDataProvider
    {
        IUserRepository Users { get; }
        IListingRepository Listings { get; }
        ICartRepository Carts { get; }
        IUnitOfWork Uow { get; }
    }
}