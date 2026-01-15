using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ReviewDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string SellerId { get; set; } = string.Empty;
    [FirestoreProperty] public string ReviewerId { get; set; } = string.Empty;
    [FirestoreProperty] public string? ListingId { get; set; }
    [FirestoreProperty] public string? OrderId { get; set; }
    [FirestoreProperty] public int Rating { get; set; }
    [FirestoreProperty] public string Comment { get; set; } = string.Empty;
    [FirestoreProperty] public int HelpfulCount { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public static ReviewDocument FromDomain(Review review) => new()
    {
        Id = FirestoreId.ToString(review.Id),
        SellerId = FirestoreId.ToString(review.SellerId),
        ReviewerId = FirestoreId.ToString(review.ReviewerId),
        ListingId = review.ListingId.HasValue ? FirestoreId.ToString(review.ListingId.Value) : null,
        OrderId = review.OrderId.HasValue ? FirestoreId.ToString(review.OrderId.Value) : null,
        Rating = review.Rating,
        Comment = review.Comment,
        HelpfulCount = review.HelpfulCount,
        CreatedAt = review.CreatedAt,
        UpdatedAt = review.UpdatedAt
    };

    public Review ToDomain() => new()
    {
        Id = FirestoreId.ParseRequired(Id),
        SellerId = FirestoreId.ParseRequired(SellerId),
        ReviewerId = FirestoreId.ParseRequired(ReviewerId),
        ListingId = string.IsNullOrWhiteSpace(ListingId) ? null : FirestoreId.ParseRequired(ListingId),
        OrderId = string.IsNullOrWhiteSpace(OrderId) ? null : FirestoreId.ParseRequired(OrderId),
        Rating = Rating,
        Comment = Comment ?? string.Empty,
        HelpfulCount = HelpfulCount,
        CreatedAt = CreatedAt,
        UpdatedAt = UpdatedAt
    };
}
