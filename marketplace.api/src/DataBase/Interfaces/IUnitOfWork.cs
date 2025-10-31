namespace SBay.Domain.Database
{
    public interface IUnitOfWork
    {
        Task<int> SaveChangesAsync(CancellationToken ct);
        Task<IAsyncDisposable?> BeginTransactionAsync(CancellationToken ct);
    }
}