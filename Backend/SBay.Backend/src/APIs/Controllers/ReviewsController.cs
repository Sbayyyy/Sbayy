using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Domain.Authentication;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.Api.Controllers;

[ApiController]
[Route("api/reviews")]
public sealed class ReviewsController : ControllerBase
{
    private readonly IReviewRepository _reviews;
    private readonly IUserRepository _users;
    private readonly IListingRepository _listings;
    private readonly IOrderRepository _orders;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUnitOfWork _uow;

    public ReviewsController(
        IReviewRepository reviews,
        IUserRepository users,
        IListingRepository listings,
        IOrderRepository orders,
        ICurrentUserResolver resolver,
        IUnitOfWork uow)
    {
        _reviews = reviews;
        _users = users;
        _listings = listings;
        _orders = orders;
        _resolver = resolver;
        _uow = uow;
    }

    [HttpGet("product/{productId:guid}")]
    public async Task<ActionResult<object>> GetByProduct(Guid productId, [FromQuery] int page = 1, [FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var (pageValue, limitValue) = NormalizePaging(page, limit);
        var (items, total) = await _reviews.GetByListingAsync(productId, pageValue, limitValue, ct);
        var stats = await _reviews.GetStatsByListingAsync(productId, ct);
        var currentUserId = await _resolver.GetUserIdAsync(User, ct);
        var dtos = await MapReviewsAsync(items, currentUserId, ct);
        return Ok(new { reviews = dtos, stats = ToStats(stats), total });
    }

    [HttpGet("seller/{sellerId:guid}")]
    public async Task<ActionResult<object>> GetBySeller(Guid sellerId, [FromQuery] int page = 1, [FromQuery] int limit = 10, CancellationToken ct = default)
    {
        var (pageValue, limitValue) = NormalizePaging(page, limit);
        var (items, total) = await _reviews.GetBySellerAsync(sellerId, pageValue, limitValue, ct);
        var stats = await _reviews.GetStatsBySellerAsync(sellerId, ct);
        var currentUserId = await _resolver.GetUserIdAsync(User, ct);
        var dtos = await MapReviewsAsync(items, currentUserId, ct);
        return Ok(new { reviews = dtos, stats = ToStats(stats), total });
    }

    [HttpGet("my-reviews")]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<IReadOnlyList<ReviewDto>>> GetMyReviews(CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var items = await _reviews.GetByReviewerAsync(me.Value, ct);
        var dtos = await MapReviewsAsync(items, me, ct);
        return Ok(dtos);
    }

    [HttpPost]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    public async Task<ActionResult<ReviewDto>> Create([FromBody] CreateReviewRequest req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();
        if (req == null) return BadRequest("Review payload is required.");
        if (req.Rating < 1 || req.Rating > 5) return BadRequest("Rating must be between 1 and 5.");
        if (string.IsNullOrWhiteSpace(req.Comment)) return BadRequest("Comment is required.");
        if (!req.OrderId.HasValue || req.OrderId.Value == Guid.Empty)
            return BadRequest("OrderId is required to create a review.");

        var order = await _orders.GetWithItemsAsync(req.OrderId.Value, ct);
        if (order == null) return NotFound("Order not found.");
        if (order.BuyerId != me.Value) return Forbid();
        if (order.Status != OrderStatus.Completed) return BadRequest("Order must be completed before reviewing.");

        var sellerId = order.SellerId;
        if (req.SellerId.HasValue && req.SellerId.Value != sellerId)
            return BadRequest("Seller does not match order.");
        if (sellerId == me.Value) return Forbid();

        Guid? listingId = null;
        if (req.ProductId.HasValue && req.ProductId.Value != Guid.Empty)
        {
            if (!order.Items.Any(i => i.ListingId == req.ProductId.Value))
                return BadRequest("Listing is not part of the order.");
            listingId = req.ProductId.Value;
        }

        var existing = await _reviews.GetByOrderAndReviewerAsync(order.Id, me.Value, ct);
        if (existing != null) return BadRequest("Review already exists for this order.");

        var review = new Review
        {
            Id = Guid.NewGuid(),
            SellerId = sellerId,
            ReviewerId = me.Value,
            ListingId = listingId,
            OrderId = order.Id,
            Rating = req.Rating,
            Comment = req.Comment.Trim(),
            HelpfulCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var seller = await _users.GetByIdAsync(sellerId, ct);
        if (seller == null) return NotFound("Seller not found.");

        await using var tx = await _uow.BeginTransactionAsync(ct);
        await _reviews.AddAsync(review, ct);
        ApplyReviewCreated(seller, review.Rating);
        await _users.UpdateAsync(seller, ct);
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var dto = await MapReviewAsync(review, me, ct);
        return CreatedAtAction(nameof(GetBySeller), new { sellerId }, dto);
    }

    [HttpPatch("{id:guid}")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    public async Task<ActionResult<ReviewDto>> Update(Guid id, [FromBody] UpdateReviewRequest req, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var review = await _reviews.GetByIdAsync(id, ct);
        if (review == null) return NotFound();
        if (review.ReviewerId != me.Value && !User.IsInRole("admin")) return Forbid();

        var previousRating = review.Rating;

        if (req.Rating.HasValue)
        {
            if (req.Rating.Value < 1 || req.Rating.Value > 5)
                return BadRequest("Rating must be between 1 and 5.");
            review.Rating = req.Rating.Value;
        }

        if (req.Comment != null)
        {
            if (string.IsNullOrWhiteSpace(req.Comment))
                return BadRequest("Comment cannot be empty.");
            review.Comment = req.Comment.Trim();
        }

        review.UpdatedAt = DateTime.UtcNow;

        var seller = await _users.GetByIdAsync(review.SellerId, ct);
        if (seller == null) return NotFound("Seller not found.");

        await using var tx = await _uow.BeginTransactionAsync(ct);
        await _reviews.UpdateAsync(review, ct);
        if (req.Rating.HasValue)
        {
            ApplyReviewUpdated(seller, previousRating, review.Rating);
            await _users.UpdateAsync(seller, ct);
        }
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        var dto = await MapReviewAsync(review, me, ct);
        return Ok(dto);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = ScopePolicies.UsersWrite)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var review = await _reviews.GetByIdAsync(id, ct);
        if (review == null) return NotFound();
        if (review.ReviewerId != me.Value && !User.IsInRole("admin")) return Forbid();

        var seller = await _users.GetByIdAsync(review.SellerId, ct);
        if (seller == null) return NotFound("Seller not found.");

        await using var tx = await _uow.BeginTransactionAsync(ct);
        await _reviews.RemoveAsync(review, ct);
        ApplyReviewDeleted(seller, review.Rating);
        await _users.UpdateAsync(seller, ct);
        await _uow.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/helpful")]
    [Authorize(Policy = ScopePolicies.UsersRead)]
    public async Task<ActionResult<object>> ToggleHelpful(Guid id, CancellationToken ct)
    {
        var me = await _resolver.GetUserIdAsync(User, ct);
        if (!me.HasValue || me.Value == Guid.Empty) return Unauthorized();

        var (count, isHelpful) = await _reviews.ToggleHelpfulAsync(id, me.Value, ct);
        if (count == 0 && !isHelpful)
        {
            var exists = await _reviews.GetByIdAsync(id, ct);
            if (exists == null) return NotFound();
        }

        await _uow.SaveChangesAsync(ct);
        return Ok(new { helpful = count, isHelpful });
    }

    private static void ApplyReviewCreated(User seller, int rating)
    {
        var currentCount = seller.ReviewCount;
        var newCount = currentCount + 1;
        var newAverage = ((seller.Rating * currentCount) + rating) / newCount;
        seller.ReviewCount = newCount;
        seller.Rating = Math.Round(newAverage, 2);
    }

    private static void ApplyReviewUpdated(User seller, int oldRating, int newRating)
    {
        var count = Math.Max(1, seller.ReviewCount);
        var newAverage = ((seller.Rating * count) - oldRating + newRating) / count;
        seller.Rating = Math.Round(newAverage, 2);
    }

    private static void ApplyReviewDeleted(User seller, int rating)
    {
        var currentCount = seller.ReviewCount;
        if (currentCount <= 1)
        {
            seller.ReviewCount = 0;
            seller.Rating = 0;
            return;
        }

        var newCount = currentCount - 1;
        var newAverage = ((seller.Rating * currentCount) - rating) / newCount;
        seller.ReviewCount = newCount;
        seller.Rating = Math.Round(newAverage, 2);
    }

    private async Task<IReadOnlyList<ReviewDto>> MapReviewsAsync(IReadOnlyList<Review> reviews, Guid? currentUserId, CancellationToken ct)
    {
        var dtos = new List<ReviewDto>(reviews.Count);
        foreach (var review in reviews)
            dtos.Add(await MapReviewAsync(review, currentUserId, ct));
        return dtos;
    }

    private async Task<ReviewDto> MapReviewAsync(Review review, Guid? currentUserId, CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(review.ReviewerId, ct);
        var userName = user?.DisplayName ?? user?.Email ?? "User";
        var userAvatar = user?.AvatarUrl;
        var isHelpful = currentUserId.HasValue
            ? await _reviews.IsMarkedHelpfulAsync(review.Id, currentUserId.Value, ct)
            : false;

        return new ReviewDto(
            review.Id,
            review.ReviewerId,
            userName,
            userAvatar,
            review.ListingId,
            review.SellerId,
            review.OrderId,
            review.Rating,
            review.Comment,
            review.HelpfulCount,
            isHelpful,
            review.CreatedAt,
            review.UpdatedAt
        );
    }

    private static ReviewStatsDto ToStats(ReviewStatsResult stats)
        => new(stats.Average, stats.Total, stats.Distribution);

    private static (int Page, int Limit) NormalizePaging(int page, int limit)
    {
        var normalizedPage = page < 1 ? 1 : page;
        var normalizedLimit = limit < 1 ? 10 : Math.Min(limit, 100);
        return (normalizedPage, normalizedLimit);
    }
}
