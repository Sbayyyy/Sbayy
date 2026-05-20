using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface INotificationPreferenceRepository
    {
        Task<NotificationPreference> GetOrDefaultAsync(Guid userId, CancellationToken ct);
        Task UpsertAsync(NotificationPreference preferences, CancellationToken ct);
    }
}
