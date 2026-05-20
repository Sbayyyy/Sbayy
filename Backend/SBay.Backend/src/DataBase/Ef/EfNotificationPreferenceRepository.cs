using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfNotificationPreferenceRepository : INotificationPreferenceRepository
    {
        private readonly EfDbContext _db;

        public EfNotificationPreferenceRepository(EfDbContext db)
        {
            _db = db;
        }

        public async Task<NotificationPreference> GetOrDefaultAsync(Guid userId, CancellationToken ct)
        {
            return await _db.Set<NotificationPreference>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId, ct)
                ?? NotificationPreference.Defaults(userId, DateTimeOffset.UtcNow);
        }

        public async Task UpsertAsync(NotificationPreference preferences, CancellationToken ct)
        {
            var existing = await _db.Set<NotificationPreference>()
                .FirstOrDefaultAsync(x => x.UserId == preferences.UserId, ct);

            if (existing is null)
            {
                await _db.Set<NotificationPreference>().AddAsync(preferences, ct);
                return;
            }

            existing.EmailNewBids = preferences.EmailNewBids;
            existing.EmailOutbidAlerts = preferences.EmailOutbidAlerts;
            existing.EmailWonAuctions = preferences.EmailWonAuctions;
            existing.EmailMessages = preferences.EmailMessages;
            existing.EmailPriceDrops = preferences.EmailPriceDrops;
            existing.EmailPromotions = preferences.EmailPromotions;
            existing.PushNewBids = preferences.PushNewBids;
            existing.PushOutbidAlerts = preferences.PushOutbidAlerts;
            existing.PushWonAuctions = preferences.PushWonAuctions;
            existing.PushMessages = preferences.PushMessages;
            existing.UpdatedAt = preferences.UpdatedAt;
        }
    }
}
