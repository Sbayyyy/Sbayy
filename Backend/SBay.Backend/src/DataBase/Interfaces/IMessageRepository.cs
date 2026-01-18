using SBay.Backend.Messaging;

namespace SBay.Domain.Database
{
    public interface IMessageRepository : IReadStore<Message>, IWriteStore<Message>
    {
        Task<int> CountSentSinceAsync(Guid senderId, DateTime from, CancellationToken ct);
        Task<int> CountUnreadAsync(Guid receiverId, CancellationToken ct);
        Task<int> CountUnreadForChatAsync(Guid chatId, Guid receiverId, CancellationToken ct);
        Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take, DateTime? before, CancellationToken ct);
        Task<int> MarkReadUpToAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct);
    }
}
