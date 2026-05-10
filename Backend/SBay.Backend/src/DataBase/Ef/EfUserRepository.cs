using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfUserRepository : IUserRepository
    {
        private EfDbContext _db;

        public EfUserRepository(EfDbContext dbContext)
        {
            this._db = dbContext;
        }

        public async Task AddAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                await _db.Set<User>().AddAsync(entity, ct);
            }
            catch (Exception ex)
            {
                throw new Exception("Error adding User", ex);
            }
        }

        public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<User>().AsNoTracking().AnyAsync(l => l.Id == id, ct);
        }

        public async Task<User?> GetByExternalIdAsync(string externalId, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(externalId)) return null;
            return await _db.Set<User>()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.ExternalId == externalId, ct);
        }

        public async Task<User> GetByIdAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<User>()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id, ct);
        }

        public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            return await _db.Set<User>()
                .FirstOrDefaultAsync(u => u.Email == email, ct);
        }

        public async Task<bool> EmailExistsAsync(string email, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            return await _db.Set<User>()
                .AsNoTracking()
                .AnyAsync(u => u.Email == email, ct);
        }

        public Task RemoveAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                _db.Set<User>().Remove(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error removing User", ex);
            }
        }

        public Task UpdateAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                _db.Set<User>().Update(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error updating User", ex);
            }
        }

        public async Task<bool> TryConsumeListingSlotAsync(Guid userId, int limit, DateTimeOffset now, int periodHours, CancellationToken ct)
        {
            if (limit <= 0) return false;

            var resetAt = now.AddHours(periodHours);
            var rows = await _db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE users
SET listing_limit_count = CASE
        WHEN listing_limit_reset_at IS NULL OR listing_limit_reset_at <= {now} THEN 1
        ELSE listing_limit_count + 1
    END,
    listing_limit_reset_at = CASE
        WHEN listing_limit_reset_at IS NULL OR listing_limit_reset_at <= {now} THEN {resetAt}
        ELSE listing_limit_reset_at
    END
WHERE id = {userId}
  AND listing_limit = {limit}
  AND (
        ((listing_limit_reset_at IS NULL OR listing_limit_reset_at <= {now}) AND {limit} > 0)
        OR (listing_limit_reset_at > {now} AND listing_limit_count < {limit})
      );", ct);

            return rows == 1;
        }
    }
}
