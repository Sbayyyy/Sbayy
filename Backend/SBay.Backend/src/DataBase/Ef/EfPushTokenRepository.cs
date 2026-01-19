using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfPushTokenRepository : IPushTokenRepository
    {
        private readonly EfDbContext _db;

        public EfPushTokenRepository(EfDbContext dbContext)
        {
            _db = dbContext;
        }

        public async Task<IReadOnlyList<PushToken>> GetTokensAsync(Guid userId, CancellationToken ct)
        {
            return await _db.Set<PushToken>()
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .ToListAsync(ct);
        }

        public async Task UpsertAsync(Guid userId, string token, string? platform, string? deviceId, DateTimeOffset now, CancellationToken ct)
        {
            var existing = await _db.Set<PushToken>()
                .FirstOrDefaultAsync(x => x.Token == token, ct);

            if (existing is null)
            {
                var entity = new PushToken
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Token = token,
                    Platform = platform,
                    DeviceId = deviceId,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                await _db.Set<PushToken>().AddAsync(entity, ct);
                await _db.SaveChangesAsync(ct);
                return;
            }

            existing.UserId = userId;
            existing.Platform = platform;
            existing.DeviceId = deviceId;
            existing.UpdatedAt = now;
            _db.Set<PushToken>().Update(existing);
            await _db.SaveChangesAsync(ct);
        }

        public async Task RemoveAsync(Guid userId, string token, CancellationToken ct)
        {
            var existing = await _db.Set<PushToken>()
                .FirstOrDefaultAsync(x => x.UserId == userId && x.Token == token, ct);
            if (existing is null) return;
            _db.Set<PushToken>().Remove(existing);
            await _db.SaveChangesAsync(ct);
        }
    }
}
