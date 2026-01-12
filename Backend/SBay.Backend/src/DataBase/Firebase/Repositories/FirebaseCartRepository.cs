using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseCartRepository : ICartRepository
{
    private readonly FirestoreDb _db;

    public FirebaseCartRepository(FirestoreDb db)
    {
        _db = db;
    }

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

    private static ShoppingCart Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<ShoppingCartDocument>()
                  ?? throw new DatabaseException("Cart conversion failed");
        return doc.ToDomain();
    }

    public async Task<ShoppingCart> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("carts")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        if (!doc.Exists)
            throw new DatabaseException("Cart not found");

        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("carts")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        return doc.Exists;
    }

    public async Task AddAsync(ShoppingCart entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("carts")
               .Document(entity.Id.ToString())
               .SetAsync(ShoppingCartDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(ShoppingCart entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("carts")
               .Document(entity.Id.ToString())
               .SetAsync(ShoppingCartDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(ShoppingCart entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("carts")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }

    public async Task<ShoppingCart?> GetByUserIdAsync(Guid userId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("carts")
               .WhereEqualTo("UserId", userId.ToString())
               .Limit(1)
               .GetSnapshotAsync(ct));

        var doc = snapshot.Documents.FirstOrDefault();
        if (doc == null || !doc.Exists)
            return null;

        return Convert(doc);
    }
}
