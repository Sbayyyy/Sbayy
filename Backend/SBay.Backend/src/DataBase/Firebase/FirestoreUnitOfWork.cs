using Google.Cloud.Firestore;
using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirestoreUnitOfWork : IUnitOfWork
{
    private readonly FirestoreDb _db;

    public FirestoreUnitOfWork(FirestoreDb db)
    {
        _db = db;
    }

    public Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken ct)
    {
        if (FirestoreWriteContext.Batch != null)
            throw new InvalidOperationException("A Firestore batch transaction is already active.");

        var batch = _db.StartBatch();
        FirestoreWriteContext.Batch = batch;
        return Task.FromResult<IUnitOfWorkTransaction>(new FirestoreUnitOfWorkTransaction(batch));
    }

    public Task<int> SaveChangesAsync(CancellationToken ct) => Task.FromResult(0);
}

internal sealed class FirestoreUnitOfWorkTransaction : IUnitOfWorkTransaction
{
    private readonly WriteBatch _batch;

    public FirestoreUnitOfWorkTransaction(WriteBatch batch)
    {
        _batch = batch;
    }

    public async Task CommitAsync(CancellationToken ct)
    {
        await _batch.CommitAsync(ct);
        FirestoreWriteContext.Batch = null;
    }

    public Task RollbackAsync(CancellationToken ct)
    {
        FirestoreWriteContext.Batch = null;
        return Task.CompletedTask;
    }

    public ValueTask DisposeAsync()
    {
        FirestoreWriteContext.Batch = null;
        return ValueTask.CompletedTask;
    }
}
