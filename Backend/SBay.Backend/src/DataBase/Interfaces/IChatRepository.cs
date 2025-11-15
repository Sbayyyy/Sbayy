using SBay.Backend.Messaging;

namespace SBay.Domain.Database
{
    public interface IChatRepository : IReadStore<Chat>, IWriteStore<Chat>
    {
        Task<Chat?> FindByParticipantsAsync(Guid buyerId, Guid sellerId, Guid? listingId, CancellationToken ct);
        Task<IReadOnlyList<Chat>> GetInboxAsync(Guid userId, int take, int skip, CancellationToken ct);
        Task<bool> UpdateLastMessageTimestampAsync(Guid chatId, DateTime timestamp, CancellationToken ct);
    }
}
