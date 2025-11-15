using System.Reflection;
using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.DataBase.Queries;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseImageRepository : IImageRepository
{
    private readonly FirestoreDb _db;

    public FirebaseImageRepository(FirestoreDb db)
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

    private static ListingImage Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<ListingImageDocument>()
                  ?? throw new DatabaseException("Image conversion failed");
        return doc.ToDomain();
    }

    public async Task<ListingImage> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("listing_images")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        if (!doc.Exists)
            throw new DatabaseException("Image not found");

        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("listing_images")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        return doc.Exists;
    }

    public async Task AddAsync(ListingImage entity, CancellationToken ct)
    {
        var doc = ListingImageDocument.FromDomain(entity);
        SyncEntityId(entity, doc);
        await EnsureCompleted(
            _db.Collection("listing_images")
               .Document(doc.Id.ToString())
               .SetAsync(doc, cancellationToken: ct));
    }

    public async Task UpdateAsync(ListingImage entity, CancellationToken ct)
    {
        var doc = ListingImageDocument.FromDomain(entity);
        SyncEntityId(entity, doc);
        await EnsureCompleted(
            _db.Collection("listing_images")
               .Document(doc.Id.ToString())
               .SetAsync(doc, cancellationToken: ct));
    }

    public async Task RemoveAsync(ListingImage entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("listing_images")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }

    public async Task<IReadOnlyList<ListingImage>> GetByListingId(Guid listingID, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("listing_images")
               .WhereEqualTo("ListingId", listingID)
               .GetSnapshotAsync(ct));

        if (snapshot == null || snapshot.Count == 0)
            return Array.Empty<ListingImage>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .OrderBy(i => i.Position)
            .ToList();
    }

    public async Task<IReadOnlyList<ListingImage>> SearchAsync(ImageQuery listingQuery, CancellationToken ct)
    {
        var collection = _db.Collection("listing_images");
        Query query = collection;
        if (listingQuery.ListingId.HasValue)
            query = query.WhereEqualTo("ListingId", listingQuery.ListingId.Value);

        var snapshot = await EnsureCompleted(query.GetSnapshotAsync(ct));
        if (snapshot == null || snapshot.Count == 0)
            return Array.Empty<ListingImage>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .OrderBy(i => i.Position)
            .ToList();
    }

    private static void SyncEntityId(ListingImage entity, ListingImageDocument doc)
    {
        if (entity.Id != Guid.Empty) return;
        typeof(ListingImage)
            .GetProperty(nameof(ListingImage.Id), BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)?
            .SetValue(entity, doc.Id);
    }
}
