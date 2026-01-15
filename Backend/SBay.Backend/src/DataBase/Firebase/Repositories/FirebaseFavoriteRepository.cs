using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirebaseFavoriteRepository : IFavoriteRepository
{
    private readonly FirestoreDb _db;
    public FirebaseFavoriteRepository(FirestoreDb db) => _db = db;

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

    private static FavoriteListing Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<FavoriteListingDocument>()
                  ?? throw new DatabaseException("Favorite conversion failed");
        return doc.ToDomain();
    }

    public async Task<IReadOnlyList<FavoriteListing>> GetByUserAsync(Guid userId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("favorites")
                .WhereEqualTo("UserId", userId.ToString())
                .OrderByDescending("CreatedAt")
                .GetSnapshotAsync(ct));

        if (snapshot.Count == 0)
            return Array.Empty<FavoriteListing>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();
    }

    public async Task<bool> ExistsAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("favorites")
                .Document(ComposeId(userId, listingId))
                .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    public async Task AddAsync(FavoriteListing entity, CancellationToken ct)
    {
        var docRef = _db.Collection("favorites")
            .Document(ComposeId(entity.UserId, entity.ListingId));
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Set(docRef, FavoriteListingDocument.FromDomain(entity));
            return;
        }

        await EnsureCompleted(docRef.SetAsync(FavoriteListingDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Guid userId, Guid listingId, CancellationToken ct)
    {
        var docRef = _db.Collection("favorites")
            .Document(ComposeId(userId, listingId));
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Delete(docRef);
            return;
        }

        await EnsureCompleted(docRef.DeleteAsync(cancellationToken: ct));
    }

    private static string ComposeId(Guid userId, Guid listingId)
        => $"{FirestoreId.ToString(userId)}_{FirestoreId.ToString(listingId)}";
}
