using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public sealed class EfReviewRepository : IReviewRepository
{
    private readonly EfDbContext _db;
    public EfReviewRepository(EfDbContext db) => _db = db;

    public async Task<Review?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Review>()
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, ct);
    }

    public async Task<(IReadOnlyList<Review> Reviews, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct)
    {
        var query = _db.Set<Review>()
            .AsNoTracking()
            .Where(r => r.SellerId == sellerId);
        var total = await query.CountAsync(ct);
        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (reviews, total);
    }

    public async Task<(IReadOnlyList<Review> Reviews, int Total)> GetByListingAsync(Guid listingId, int page, int pageSize, CancellationToken ct)
    {
        var query = _db.Set<Review>()
            .AsNoTracking()
            .Where(r => r.ListingId == listingId);
        var total = await query.CountAsync(ct);
        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);
        return (reviews, total);
    }

    public async Task<IReadOnlyList<Review>> GetByReviewerAsync(Guid reviewerId, CancellationToken ct)
    {
        return await _db.Set<Review>()
            .AsNoTracking()
            .Where(r => r.ReviewerId == reviewerId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<Review?> GetByOrderAndReviewerAsync(Guid orderId, Guid reviewerId, CancellationToken ct)
    {
        return await _db.Set<Review>()
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.OrderId == orderId && r.ReviewerId == reviewerId, ct);
    }

    public async Task AddAsync(Review review, CancellationToken ct)
    {
        await _db.Set<Review>().AddAsync(review, ct);
    }

    public Task UpdateAsync(Review review, CancellationToken ct)
    {
        _db.Set<Review>().Update(review);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Review review, CancellationToken ct)
    {
        _db.Set<Review>().Remove(review);
        return Task.CompletedTask;
    }

    public async Task<ReviewStatsResult> GetStatsBySellerAsync(Guid sellerId, CancellationToken ct)
    {
        return await BuildStatsAsync(_db.Set<Review>().AsNoTracking().Where(r => r.SellerId == sellerId), ct);
    }

    public async Task<ReviewStatsResult> GetStatsByListingAsync(Guid listingId, CancellationToken ct)
    {
        return await BuildStatsAsync(_db.Set<Review>().AsNoTracking().Where(r => r.ListingId == listingId), ct);
    }

    public async Task<(int HelpfulCount, bool IsHelpful)?> ToggleHelpfulAsync(Guid reviewId, Guid userId, CancellationToken ct)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var review = await _db.Set<Review>()
                .FirstOrDefaultAsync(r => r.Id == reviewId, ct);
            if (review == null) return null;

            var helpful = await _db.Set<ReviewHelpful>()
                .FirstOrDefaultAsync(h => h.ReviewId == reviewId && h.UserId == userId, ct);

            if (helpful == null)
            {
                _db.Set<ReviewHelpful>().Add(new ReviewHelpful
                {
                    ReviewId = reviewId,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                });
                review.HelpfulCount += 1;
                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                return (review.HelpfulCount, true);
            }

            _db.Set<ReviewHelpful>().Remove(helpful);
            review.HelpfulCount = Math.Max(0, review.HelpfulCount - 1);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return (review.HelpfulCount, false);
        }
        catch (DbUpdateException)
        {
            var currentReview = await _db.Set<Review>()
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == reviewId, ct);
            if (currentReview == null) return null;

            var exists = await _db.Set<ReviewHelpful>()
                .AsNoTracking()
                .AnyAsync(h => h.ReviewId == reviewId && h.UserId == userId, ct);
            return (currentReview.HelpfulCount, exists);
        }
    }

    public async Task<bool> IsMarkedHelpfulAsync(Guid reviewId, Guid userId, CancellationToken ct)
    {
        return await _db.Set<ReviewHelpful>()
            .AsNoTracking()
            .AnyAsync(h => h.ReviewId == reviewId && h.UserId == userId, ct);
    }

    private static async Task<ReviewStatsResult> BuildStatsAsync(IQueryable<Review> query, CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var average = total == 0
            ? 0m
            : await query.AverageAsync(r => (decimal)r.Rating, ct);

        var groups = await query
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var distribution = new Dictionary<int, int>
        {
            [1] = 0,
            [2] = 0,
            [3] = 0,
            [4] = 0,
            [5] = 0
        };
        foreach (var g in groups)
            distribution[g.Rating] = g.Count;

        return new ReviewStatsResult(average, total, distribution);
    }
}
