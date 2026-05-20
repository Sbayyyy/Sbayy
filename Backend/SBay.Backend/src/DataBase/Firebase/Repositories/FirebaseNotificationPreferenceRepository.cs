using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebaseNotificationPreferenceRepository : INotificationPreferenceRepository
    {
        public Task<NotificationPreference> GetOrDefaultAsync(Guid userId, CancellationToken ct)
        {
            return Task.FromResult(NotificationPreference.Defaults(userId, DateTimeOffset.UtcNow));
        }

        public Task UpsertAsync(NotificationPreference preferences, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification preference storage is not implemented.");
        }
    }
}
