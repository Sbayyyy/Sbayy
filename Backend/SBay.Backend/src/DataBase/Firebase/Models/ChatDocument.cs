using Google.Cloud.Firestore;
using SBay.Backend.Messaging;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ChatDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string BuyerId { get; set; } = string.Empty;
    [FirestoreProperty] public string SellerId { get; set; } = string.Empty;
    [FirestoreProperty] public string? ListingId { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime? LastMessageAt { get; set; }
    [FirestoreProperty] public bool BuyerArchived { get; set; }
    [FirestoreProperty] public bool SellerArchived { get; set; }

    public static ChatDocument FromDomain(Chat chat) => new()
    {
        Id = FirestoreId.ToString(chat.Id),
        BuyerId = FirestoreId.ToString(chat.BuyerId),
        SellerId = FirestoreId.ToString(chat.SellerId),
        ListingId = FirestoreId.ToString(chat.ListingId),
        CreatedAt = chat.CreatedAt,
        LastMessageAt = chat.LastMessageAt,
        BuyerArchived = chat.BuyerArchived,
        SellerArchived = chat.SellerArchived
    };

    public Chat ToDomain()
    {
        return new Chat
        {
            Id = FirestoreId.ParseRequired(Id),
            BuyerId = FirestoreId.ParseRequired(BuyerId),
            SellerId = FirestoreId.ParseRequired(SellerId),
            ListingId = FirestoreId.ParseNullable(ListingId),
            CreatedAt = CreatedAt,
            LastMessageAt = LastMessageAt,
            BuyerArchived = BuyerArchived,
            SellerArchived = SellerArchived
        };
    }
}
