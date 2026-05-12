using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebaseNotificationRepository : INotificationRepository
    {
        public Task<IReadOnlyList<UserNotification>> GetAsync(Guid userId, int take, int skip, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification storage is not implemented.");
        }

        public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification storage is not implemented.");
        }

        public Task AddAsync(UserNotification notification, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification storage is not implemented.");
        }

        public Task<int> MarkAllReadAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification storage is not implemented.");
        }

        public Task ArchiveAsync(Guid userId, Guid notificationId, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore notification storage is not implemented.");
        }
    }
}
