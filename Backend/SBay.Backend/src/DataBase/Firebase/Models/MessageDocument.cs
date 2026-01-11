using Google.Cloud.Firestore;
using SBay.Backend.Messaging;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class MessageDocument
{
    [FirestoreProperty] public string Id { get; set; } = string.Empty;
    [FirestoreProperty] public string ChatId { get; set; } = string.Empty;
    [FirestoreProperty] public string Content { get; set; } = string.Empty;
    [FirestoreProperty] public string SenderId { get; set; } = string.Empty;
    [FirestoreProperty] public string ReceiverId { get; set; } = string.Empty;
    [FirestoreProperty] public string? ListingId { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public bool IsRead { get; set; }

    public static MessageDocument FromDomain(Message message) => new()
    {
        Id = FirestoreId.ToString(message.Id),
        ChatId = FirestoreId.ToString(message.ChatId),
        Content = message.Content,
        SenderId = FirestoreId.ToString(message.SenderId),
        ReceiverId = FirestoreId.ToString(message.ReceiverId),
        ListingId = FirestoreId.ToString(message.ListingId),
        CreatedAt = message.CreatedAt,
        IsRead = message.IsRead
    };

    public Message ToDomain()
    {
        return new Message
        {
            Id = FirestoreId.ParseRequired(Id),
            ChatId = FirestoreId.ParseRequired(ChatId),
            Content = Content,
            SenderId = FirestoreId.ParseRequired(SenderId),
            ReceiverId = FirestoreId.ParseRequired(ReceiverId),
            ListingId = FirestoreId.ParseNullable(ListingId),
            CreatedAt = CreatedAt,
            IsRead = IsRead
        };
    }
}
