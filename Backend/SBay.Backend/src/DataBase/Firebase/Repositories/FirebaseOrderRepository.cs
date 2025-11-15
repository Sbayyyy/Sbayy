using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseOrderRepository : IOrderRepository
{
    private readonly FirestoreDb _db;
    public FirebaseOrderRepository(FirestoreDb db) => _db = db;

    private static async Task<T> EnsureCompleted<T>(Task<T> task)
    {
        var result = await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
        return result;
    }

    private static async Task EnsureCompleted(Task task)
    {
        await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
    }

    private static Order Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<OrderDocument>()
                  ?? throw new DatabaseException("Order conversion failed");
        return doc.ToDomain();
    }

    public async Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("orders")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("orders")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("orders")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    public async Task AddAsync(Order entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("orders")
               .Document(entity.Id.ToString())
               .SetAsync(OrderDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(Order entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("orders")
               .Document(entity.Id.ToString())
               .SetAsync(OrderDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Order entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("orders")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }
}
