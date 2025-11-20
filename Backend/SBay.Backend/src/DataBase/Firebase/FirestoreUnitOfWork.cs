using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirestoreUnitOfWork : IUnitOfWork
{
    public Task<IAsyncDisposable?> BeginTransactionAsync(CancellationToken ct)
        => Task.FromResult<IAsyncDisposable?>(null);

    public Task<int> SaveChangesAsync(CancellationToken ct) => Task.FromResult(0);
}
