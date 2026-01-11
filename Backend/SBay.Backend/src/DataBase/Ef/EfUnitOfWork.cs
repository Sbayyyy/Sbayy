
namespace SBay.Domain.Database
{
    public class EfUnitOfWork : IUnitOfWork
    {
        private EfDbContext _db;

        public EfUnitOfWork(EfDbContext dbContext)
        {
            this._db = dbContext;
        }

        public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct)
        {
            var transaction = await _db.Database.BeginTransactionAsync(ct);
            return new EfUnitOfWorkTransaction(transaction);
        }

        public async Task<int> SaveChangesAsync(CancellationToken ct)
        {
            return await _db.SaveChangesAsync(ct);
        }
    }

    internal sealed class EfUnitOfWorkTransaction : IUnitOfWorkTransaction
    {
        private readonly Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction _transaction;

        public EfUnitOfWorkTransaction(Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction transaction)
        {
            _transaction = transaction;
        }

        public Task CommitAsync(CancellationToken ct) => _transaction.CommitAsync(ct);

        public Task RollbackAsync(CancellationToken ct) => _transaction.RollbackAsync(ct);

        public ValueTask DisposeAsync() => _transaction.DisposeAsync();
    }
}
