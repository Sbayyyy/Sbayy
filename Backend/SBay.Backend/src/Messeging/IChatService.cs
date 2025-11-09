namespace SBay.Backend.Messaging;

public interface IChatService
{
    Task<Chat> OpenOrGetAsync(Guid me, Guid otherUserId, Guid? listingId,
        CancellationToken ct = default);

    Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default);

    Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null,
        CancellationToken ct = default);

    Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default);

    Task<IReadOnlyList<Chat>> GetInboxAsync(
        Guid me,
        int take = 20,
        int skip = 0,
        CancellationToken ct = default);
}