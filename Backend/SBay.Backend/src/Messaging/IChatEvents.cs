namespace SBay.Backend.Messaging;

public interface IChatEvents
{
    Task MessageNewAsync(Message message, CancellationToken ct);
    Task MessagesReadAsync(Guid chatId, Guid readerId, CancellationToken ct);
}