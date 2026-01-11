using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.DataBase.Queries;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseListingRepository : IListingRepository
{
    private readonly FirestoreDb _db;

    public FirebaseListingRepository(FirestoreDb db)
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

    private static Listing Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<ListingDocument>()
                  ?? throw new DatabaseException("Listing conversion failed");
        return doc.ToDomain();
    }

    public async Task<Listing?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("listings")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        if (!doc.Exists)
            return null;

        return Convert(doc);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("listings")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));

        return doc.Exists;
    }

    public async Task AddAsync(Listing entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("listings")
               .Document(entity.Id.ToString())
               .SetAsync(ListingDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task UpdateAsync(Listing entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("listings")
               .Document(entity.Id.ToString())
               .SetAsync(ListingDocument.FromDomain(entity), cancellationToken: ct));
    }

    public async Task RemoveAsync(Listing entity, CancellationToken ct)
    {
        await EnsureCompleted(
            _db.Collection("listings")
               .Document(entity.Id.ToString())
               .DeleteAsync(cancellationToken: ct));
    }

    public async Task<IReadOnlyList<Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("listings")
               .WhereEqualTo("SellerId", sellerId.ToString())
               .GetSnapshotAsync(ct));

        if (snapshot == null || snapshot.Count == 0)
            return Array.Empty<Listing>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .OrderByDescending(l => l.CreatedAt)
            .ToList();
    }

    public async Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery listingQuery, CancellationToken ct)
    {
        var query = _db.Collection("listings").WhereEqualTo("Status", "active");

        if (!string.IsNullOrWhiteSpace(listingQuery.Category))
            query = query.WhereEqualTo("CategoryPath", listingQuery.Category);

        if (!string.IsNullOrWhiteSpace(listingQuery.Region))
            query = query.WhereEqualTo("Region", listingQuery.Region);

        if (listingQuery.MinPrice.HasValue)
            query = query.WhereGreaterThanOrEqualTo("PriceAmount", (double)listingQuery.MinPrice.Value);

        if (listingQuery.MaxPrice.HasValue)
            query = query.WhereLessThanOrEqualTo("PriceAmount", (double)listingQuery.MaxPrice.Value);

        var snapshot = await EnsureCompleted(query.GetSnapshotAsync(ct));
        if (snapshot == null || snapshot.Count == 0)
            return Array.Empty<Listing>();

        var items = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        if (!string.IsNullOrWhiteSpace(listingQuery.Text))
        {
            var text = listingQuery.Text.Trim();
            items = items
                .Where(l =>
                    (!string.IsNullOrWhiteSpace(l.Title) && l.Title.Contains(text, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(l.Description) && l.Description.Contains(text, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }

        var page = listingQuery.Page <= 0 ? 1 : listingQuery.Page;
        var size = listingQuery.PageSize is < 1 or > 100 ? 24 : listingQuery.PageSize;
        var skip = (page - 1) * size;

        return items
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(size)
            .ToList();
    }

    public async Task<IReadOnlyList<Listing>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids?.Where(id => id != Guid.Empty).Distinct().ToList();
        if (idList == null || idList.Count == 0) return Array.Empty<Listing>();

        var tasks = idList.Select(id =>
            EnsureCompleted(_db.Collection("listings").Document(id.ToString()).GetSnapshotAsync(ct)));
        var snapshots = await Task.WhenAll(tasks);
        return snapshots
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();
    }

    public async Task<int> CountBySellerAsync(Guid sellerId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("listings")
               .WhereEqualTo("SellerId", sellerId.ToString())
               .GetSnapshotAsync(ct));
        return snapshot?.Count ?? 0;
    }
}
