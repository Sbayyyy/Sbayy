namespace SBay.Domain.Database
{
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken ct);
        Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct);
    }

    public interface IUnitOfWorkTransaction : IAsyncDisposable
    {
        Task CommitAsync(CancellationToken ct);
        Task RollbackAsync(CancellationToken ct);
    }
}
