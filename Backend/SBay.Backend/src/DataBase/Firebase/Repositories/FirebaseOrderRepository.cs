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

    public async Task<(IReadOnlyList<Order> Orders, int Total)> GetByBuyerAsync(Guid buyerId, int page, int pageSize, CancellationToken ct)
    {
        var baseQuery = _db.Collection("orders")
            .WhereEqualTo("BuyerId", buyerId.ToString());

        var totalSnapshot = await EnsureCompleted(baseQuery.GetSnapshotAsync(ct));
        var total = totalSnapshot.Count;

        var snapshot = await EnsureCompleted(
            baseQuery.OrderByDescending("CreatedAt")
                .Offset((page - 1) * pageSize)
                .Limit(pageSize)
                .GetSnapshotAsync(ct));

        var orders = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        return (orders, total);
    }

    public async Task<(IReadOnlyList<Order> Orders, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct)
    {
        var baseQuery = _db.Collection("orders")
            .WhereEqualTo("SellerId", sellerId.ToString());

        var totalSnapshot = await EnsureCompleted(baseQuery.GetSnapshotAsync(ct));
        var total = totalSnapshot.Count;

        var snapshot = await EnsureCompleted(
            baseQuery.OrderByDescending("CreatedAt")
                .Offset((page - 1) * pageSize)
                .Limit(pageSize)
                .GetSnapshotAsync(ct));

        var orders = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        return (orders, total);
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
        var docRef = _db.Collection("orders")
            .Document(entity.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Set(docRef, OrderDocument.FromDomain(entity));
            return;
        }

        await EnsureCompleted(docRef.SetAsync(OrderDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(Order entity, CancellationToken ct)
    {
        var docRef = _db.Collection("orders")
            .Document(entity.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Set(docRef, OrderDocument.FromDomain(entity));
            return;
        }

        await EnsureCompleted(docRef.SetAsync(OrderDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Order entity, CancellationToken ct)
    {
        var docRef = _db.Collection("orders")
            .Document(entity.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Delete(docRef);
            return;
        }

        await EnsureCompleted(docRef.DeleteAsync(cancellationToken: ct));
    }
}
