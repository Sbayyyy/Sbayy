using Google.Cloud.Firestore;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.Exceptions;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirebaseReviewRepository : IReviewRepository
{
    private readonly FirestoreDb _db;
    public FirebaseReviewRepository(FirestoreDb db) => _db = db;

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

    private static Review Convert(DocumentSnapshot snapshot)
    {
        var doc = snapshot.ConvertTo<ReviewDocument>()
                  ?? throw new DatabaseException("Review conversion failed");
        return doc.ToDomain();
    }

    public async Task<Review?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("reviews")
               .Document(id.ToString())
               .GetSnapshotAsync(ct));
        if (!doc.Exists) return null;
        return Convert(doc);
    }

    public async Task<(IReadOnlyList<Review> Reviews, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct)
    {
        var baseQuery = _db.Collection("reviews")
            .WhereEqualTo("SellerId", sellerId.ToString());

        var totalSnapshot = await EnsureCompleted(baseQuery.GetSnapshotAsync(ct));
        var total = totalSnapshot.Count;

        var snapshot = await EnsureCompleted(
            baseQuery.OrderByDescending("CreatedAt")
                .Offset((page - 1) * pageSize)
                .Limit(pageSize)
                .GetSnapshotAsync(ct));

        var reviews = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        return (reviews, total);
    }

    public async Task<(IReadOnlyList<Review> Reviews, int Total)> GetByListingAsync(Guid listingId, int page, int pageSize, CancellationToken ct)
    {
        var baseQuery = _db.Collection("reviews")
            .WhereEqualTo("ListingId", listingId.ToString());

        var totalSnapshot = await EnsureCompleted(baseQuery.GetSnapshotAsync(ct));
        var total = totalSnapshot.Count;

        var snapshot = await EnsureCompleted(
            baseQuery.OrderByDescending("CreatedAt")
                .Offset((page - 1) * pageSize)
                .Limit(pageSize)
                .GetSnapshotAsync(ct));

        var reviews = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        return (reviews, total);
    }

    public async Task<IReadOnlyList<Review>> GetByReviewerAsync(Guid reviewerId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("reviews")
                .WhereEqualTo("ReviewerId", reviewerId.ToString())
                .OrderByDescending("CreatedAt")
                .GetSnapshotAsync(ct));

        if (snapshot.Count == 0)
            return Array.Empty<Review>();

        return snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();
    }

    public async Task<Review?> GetByOrderAndReviewerAsync(Guid orderId, Guid reviewerId, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(
            _db.Collection("reviews")
                .WhereEqualTo("OrderId", orderId.ToString())
                .WhereEqualTo("ReviewerId", reviewerId.ToString())
                .GetSnapshotAsync(ct));

        var doc = snapshot.Documents.FirstOrDefault();
        return doc is { Exists: true } ? Convert(doc) : null;
    }

    public async Task AddAsync(Review review, CancellationToken ct)
    {
        var docRef = _db.Collection("reviews")
            .Document(review.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Set(docRef, ReviewDocument.FromDomain(review));
            return;
        }

        await EnsureCompleted(docRef.SetAsync(ReviewDocument.FromDomain(review), cancellationToken: ct));
    }

    public async Task UpdateAsync(Review review, CancellationToken ct)
    {
        var docRef = _db.Collection("reviews")
            .Document(review.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Set(docRef, ReviewDocument.FromDomain(review));
            return;
        }

        await EnsureCompleted(docRef.SetAsync(ReviewDocument.FromDomain(review), cancellationToken: ct));
    }

    public async Task RemoveAsync(Review review, CancellationToken ct)
    {
        var docRef = _db.Collection("reviews")
            .Document(review.Id.ToString());
        var batch = FirestoreWriteContext.Batch;
        if (batch != null)
        {
            batch.Delete(docRef);
            return;
        }

        await EnsureCompleted(docRef.DeleteAsync(cancellationToken: ct));
    }

    public async Task<ReviewStatsResult> GetStatsBySellerAsync(Guid sellerId, CancellationToken ct)
    {
        return await BuildStatsAsync(
            _db.Collection("reviews").WhereEqualTo("SellerId", sellerId.ToString()),
            ct);
    }

    public async Task<ReviewStatsResult> GetStatsByListingAsync(Guid listingId, CancellationToken ct)
    {
        return await BuildStatsAsync(
            _db.Collection("reviews").WhereEqualTo("ListingId", listingId.ToString()),
            ct);
    }

    public async Task<(int HelpfulCount, bool IsHelpful)> ToggleHelpfulAsync(Guid reviewId, Guid userId, CancellationToken ct)
    {
        var reviewDoc = await EnsureCompleted(
            _db.Collection("reviews").Document(reviewId.ToString()).GetSnapshotAsync(ct));
        if (!reviewDoc.Exists) return (0, false);

        var review = Convert(reviewDoc);
        var helpfulRef = _db.Collection("review_helpfuls")
            .Document(ComposeHelpfulId(reviewId, userId));

        var helpfulDoc = await EnsureCompleted(helpfulRef.GetSnapshotAsync(ct));
        var batch = FirestoreWriteContext.Batch;
        if (helpfulDoc.Exists)
        {
            review.HelpfulCount = Math.Max(0, review.HelpfulCount - 1);
            review.UpdatedAt = DateTime.UtcNow;

            if (batch != null)
            {
                batch.Delete(helpfulRef);
                batch.Set(reviewDoc.Reference, ReviewDocument.FromDomain(review));
                return (review.HelpfulCount, false);
            }

            var result = await EnsureCompleted(_db.RunTransactionAsync(async transaction =>
            {
                var currentReviewSnap = await transaction.GetSnapshotAsync(reviewDoc.Reference);
                if (!currentReviewSnap.Exists) return (0, false);
                var currentReview = Convert(currentReviewSnap);

                var currentHelpfulSnap = await transaction.GetSnapshotAsync(helpfulRef);
                if (!currentHelpfulSnap.Exists) return (currentReview.HelpfulCount, false);

                currentReview.HelpfulCount = Math.Max(0, currentReview.HelpfulCount - 1);
                currentReview.UpdatedAt = DateTime.UtcNow;
                transaction.Delete(helpfulRef);
                transaction.Set(reviewDoc.Reference, ReviewDocument.FromDomain(currentReview));
                return (currentReview.HelpfulCount, false);
            }, cancellationToken: ct));
            return result;
        }

        review.HelpfulCount += 1;
        review.UpdatedAt = DateTime.UtcNow;
        var helpfulPayload = new ReviewHelpfulDocument
        {
            ReviewId = FirestoreId.ToString(reviewId),
            UserId = FirestoreId.ToString(userId),
            CreatedAt = DateTime.UtcNow
        };

        if (batch != null)
        {
            batch.Set(helpfulRef, helpfulPayload);
            batch.Set(reviewDoc.Reference, ReviewDocument.FromDomain(review));
            return (review.HelpfulCount, true);
        }

        var addResult = await EnsureCompleted(_db.RunTransactionAsync(async transaction =>
        {
            var currentReviewSnap = await transaction.GetSnapshotAsync(reviewDoc.Reference);
            if (!currentReviewSnap.Exists) return (0, false);
            var currentReview = Convert(currentReviewSnap);

            var currentHelpfulSnap = await transaction.GetSnapshotAsync(helpfulRef);
            if (currentHelpfulSnap.Exists) return (currentReview.HelpfulCount, true);

            currentReview.HelpfulCount += 1;
            currentReview.UpdatedAt = DateTime.UtcNow;
            transaction.Set(helpfulRef, helpfulPayload);
            transaction.Set(reviewDoc.Reference, ReviewDocument.FromDomain(currentReview));
            return (currentReview.HelpfulCount, true);
        }, cancellationToken: ct));
        return addResult;
    }

    public async Task<bool> IsMarkedHelpfulAsync(Guid reviewId, Guid userId, CancellationToken ct)
    {
        var doc = await EnsureCompleted(
            _db.Collection("review_helpfuls")
               .Document(ComposeHelpfulId(reviewId, userId))
               .GetSnapshotAsync(ct));
        return doc.Exists;
    }

    private static async Task<ReviewStatsResult> BuildStatsAsync(Query query, CancellationToken ct)
    {
        var snapshot = await EnsureCompleted(query.GetSnapshotAsync(ct));
        var reviews = snapshot.Documents
            .Where(d => d.Exists)
            .Select(Convert)
            .ToList();

        if (reviews.Count == 0)
            return new ReviewStatsResult(0m, 0, new Dictionary<int, int> { [1] = 0, [2] = 0, [3] = 0, [4] = 0, [5] = 0 });

        var total = reviews.Count;
        var average = reviews.Average(r => r.Rating);
        var distribution = new Dictionary<int, int> { [1] = 0, [2] = 0, [3] = 0, [4] = 0, [5] = 0 };
        foreach (var review in reviews)
            distribution[review.Rating] += 1;

        return new ReviewStatsResult((decimal)average, total, distribution);
    }

    private static string ComposeHelpfulId(Guid reviewId, Guid userId)
        => $"{FirestoreId.ToString(reviewId)}_{FirestoreId.ToString(userId)}";
}
