using Google.Cloud.Firestore;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class FavoriteListingDocument
{
    [FirestoreProperty] public string UserId { get; set; } = string.Empty;
    [FirestoreProperty] public string ListingId { get; set; } = string.Empty;
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public static FavoriteListingDocument FromDomain(FavoriteListing favorite) => new()
    {
        UserId = FirestoreId.ToString(favorite.UserId),
        ListingId = FirestoreId.ToString(favorite.ListingId),
        CreatedAt = favorite.CreatedAt.UtcDateTime
    };

    public FavoriteListing ToDomain() => new()
    {
        UserId = FirestoreId.ParseRequired(UserId),
        ListingId = FirestoreId.ParseRequired(ListingId),
        CreatedAt = new DateTimeOffset(CreatedAt, TimeSpan.Zero)
    };
}
