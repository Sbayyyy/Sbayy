
namespace SBay.Domain.Database
{
    public class EfUnitOfWork : IUnitOfWork
    {
        private EfDbContext _db;

        public EfUnitOfWork(EfDbContext dbContext)
        {
            this._db = dbContext;
        }

        public async Task<IAsyncDisposable?> BeginTransactionAsync(CancellationToken ct)
        {
            return await _db.Database.BeginTransactionAsync(ct);
        }

        public async Task<int> SaveChangesAsync(CancellationToken ct)
        {
            return await _db.SaveChangesAsync(ct);
        }
    }
}