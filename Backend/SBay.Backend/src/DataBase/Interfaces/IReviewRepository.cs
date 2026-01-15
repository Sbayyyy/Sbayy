using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public sealed record ReviewStatsResult(decimal Average, int Total, IReadOnlyDictionary<int, int> Distribution);

public interface IReviewRepository
{
    Task<Review?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IReadOnlyList<Review> Reviews, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct);
    Task<(IReadOnlyList<Review> Reviews, int Total)> GetByListingAsync(Guid listingId, int page, int pageSize, CancellationToken ct);
    Task<IReadOnlyList<Review>> GetByReviewerAsync(Guid reviewerId, CancellationToken ct);
    Task<Review?> GetByOrderAndReviewerAsync(Guid orderId, Guid reviewerId, CancellationToken ct);
    Task AddAsync(Review review, CancellationToken ct);
    Task UpdateAsync(Review review, CancellationToken ct);
    Task RemoveAsync(Review review, CancellationToken ct);
    Task<ReviewStatsResult> GetStatsBySellerAsync(Guid sellerId, CancellationToken ct);
    Task<ReviewStatsResult> GetStatsByListingAsync(Guid listingId, CancellationToken ct);
    Task<(int HelpfulCount, bool IsHelpful)> ToggleHelpfulAsync(Guid reviewId, Guid userId, CancellationToken ct);
}
