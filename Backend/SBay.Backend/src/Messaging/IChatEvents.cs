namespace SBay.Backend.Messaging;

public interface IChatEvents
{
    Task MessageNewAsync(Message message, CancellationToken ct);
    Task MessagesReadAsync(Guid chatId, Guid readerId, Guid? otherUserId, CancellationToken ct);
    Task MessageUpdatedAsync(Message message, CancellationToken ct);
    Task MessageDeletedAsync(Guid messageId, Guid chatId, Guid senderId, Guid receiverId, bool isRead, CancellationToken ct);
}
