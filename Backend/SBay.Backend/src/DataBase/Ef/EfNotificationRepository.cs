using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfNotificationRepository : INotificationRepository
    {
        private readonly EfDbContext _db;

        public EfNotificationRepository(EfDbContext db)
        {
            _db = db;
        }

        public async Task<IReadOnlyList<UserNotification>> GetAsync(Guid userId, int take, int skip, CancellationToken ct)
        {
            return await _db.Set<UserNotification>()
                .AsNoTracking()
                .Where(x => x.UserId == userId && !x.IsArchived)
                .OrderByDescending(x => x.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);
        }

        public Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct)
        {
            return _db.Set<UserNotification>()
                .Where(x => x.UserId == userId && !x.IsRead && !x.IsArchived)
                .CountAsync(ct);
        }

        public async Task AddAsync(UserNotification notification, CancellationToken ct)
        {
            await _db.Set<UserNotification>().AddAsync(notification, ct);
        }

        public Task<int> MarkAllReadAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
        {
            if (!_db.Database.IsRelational())
            {
                return MarkAllReadTrackedAsync(userId, now, ct);
            }

            return _db.Set<UserNotification>()
                .Where(x => x.UserId == userId && !x.IsRead && !x.IsArchived)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.IsRead, true)
                    .SetProperty(x => x.ReadAt, now), ct);
        }

        public async Task ArchiveAsync(Guid userId, Guid notificationId, CancellationToken ct)
        {
            if (_db.Database.IsRelational())
            {
                await _db.Set<UserNotification>()
                    .Where(x => x.UserId == userId && x.Id == notificationId)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.IsArchived, true), ct);
                return;
            }

            var notification = await _db.Set<UserNotification>()
                .FirstOrDefaultAsync(x => x.UserId == userId && x.Id == notificationId, ct);
            if (notification is null) return;
            notification.IsArchived = true;
            await _db.SaveChangesAsync(ct);
        }

        private async Task<int> MarkAllReadTrackedAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
        {
            var notifications = await _db.Set<UserNotification>()
                .Where(x => x.UserId == userId && !x.IsRead && !x.IsArchived)
                .ToListAsync(ct);

            foreach (var notification in notifications)
            {
                notification.IsRead = true;
                notification.ReadAt = now;
            }

            if (notifications.Count > 0)
            {
                await _db.SaveChangesAsync(ct);
            }

            return notifications.Count;
        }
    }
}
