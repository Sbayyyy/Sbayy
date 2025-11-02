namespace SBay.Backend.Messeging;

public interface IChatService
{
    Task<Chat> GetOrCreateAsync(Guid buyerId, Guid sellerId, Guid? listingId, CancellationToken ct = default);
    Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default);
    Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null, CancellationToken ct = default);
    Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default);
}