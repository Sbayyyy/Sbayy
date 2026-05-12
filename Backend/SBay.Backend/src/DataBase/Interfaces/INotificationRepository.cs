using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface INotificationRepository
    {
        Task<IReadOnlyList<UserNotification>> GetAsync(Guid userId, int take, int skip, CancellationToken ct);
        Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct);
        Task AddAsync(UserNotification notification, CancellationToken ct);
        Task<int> MarkAllReadAsync(Guid userId, DateTimeOffset now, CancellationToken ct);
        Task ArchiveAsync(Guid userId, Guid notificationId, CancellationToken ct);
    }
}
