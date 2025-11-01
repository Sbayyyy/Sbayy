namespace SBay.Domain.Database
{
    public class EfDataProvider : IDataProvider
    {
        private readonly EfDbContext _dbContext;

        public EfDataProvider(EfDbContext dbContext)
        {
            _dbContext = dbContext;
            Users = new EfUserRepository(_dbContext);
            Listings = new EfListingRepository(_dbContext);
            Carts = new EfCartRepository(_dbContext);
            Uow = new EfUnitOfWork(_dbContext);

        }

        public IUserRepository Users { get; }
        public IListingRepository Listings { get; }
        public ICartRepository Carts { get; }
        public IUnitOfWork Uow { get; }
    }
}