using Google.Cloud.Firestore;
using SBay.Backend.Messaging;

namespace SBay.Backend.DataBase.Firebase.Models;

[FirestoreData]
internal sealed class MessageDocument
{
    [FirestoreProperty] public Guid Id { get; set; }
    [FirestoreProperty] public Guid ChatId { get; set; }
    [FirestoreProperty] public string Content { get; set; } = string.Empty;
    [FirestoreProperty] public Guid SenderId { get; set; }
    [FirestoreProperty] public Guid ReceiverId { get; set; }
    [FirestoreProperty] public Guid? ListingId { get; set; }
    [FirestoreProperty] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    [FirestoreProperty] public bool IsRead { get; set; }

    public static MessageDocument FromDomain(Message message) => new()
    {
        Id = message.Id,
        ChatId = message.ChatId,
        Content = message.Content,
        SenderId = message.SenderId,
        ReceiverId = message.ReceiverId,
        ListingId = message.ListingId,
        CreatedAt = message.CreatedAt,
        IsRead = message.IsRead
    };

    public Message ToDomain()
    {
        return new Message
        {
            Id = Id,
            ChatId = ChatId,
            Content = Content,
            SenderId = SenderId,
            ReceiverId = ReceiverId,
            ListingId = ListingId,
            CreatedAt = CreatedAt,
            IsRead = IsRead
        };
    }
}
