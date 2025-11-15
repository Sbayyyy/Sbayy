using Google.Cloud.Firestore;
using SBay.Backend.Messaging;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class ChatDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid BuyerId { get; set; }
    [FirestoreProperty] public Guid SellerId { get; set; }
    [FirestoreProperty] public Guid? ListingId { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public DateTime? LastMessageAt { get; set; }
    [FirestoreProperty] public bool BuyerArchived { get; set; }
    [FirestoreProperty] public bool SellerArchived { get; set; }

    public static ChatDocument FromDomain(Chat chat) => new()
    {
        Id = chat.Id,
        BuyerId = chat.BuyerId,
        SellerId = chat.SellerId,
        ListingId = chat.ListingId,
        CreatedAt = chat.CreatedAt,
        LastMessageAt = chat.LastMessageAt,
        BuyerArchived = chat.BuyerArchived,
        SellerArchived = chat.SellerArchived
    };

    public Chat ToDomain()
    {
        return new Chat
        {
            Id = Id,
            BuyerId = BuyerId,
            SellerId = SellerId,
            ListingId = ListingId,
            CreatedAt = CreatedAt,
            LastMessageAt = LastMessageAt,
            BuyerArchived = BuyerArchived,
            SellerArchived = SellerArchived
        };
    }
}
