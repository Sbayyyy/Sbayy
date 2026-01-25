using Microsoft.EntityFrameworkCore;
using Npgsql;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfUserBlockRepository : IUserBlockRepository
    {
        private readonly EfDbContext _db;

        public EfUserBlockRepository(EfDbContext dbContext)
        {
            _db = dbContext;
        }

        public async Task<bool> IsBlockedAsync(Guid blockerId, Guid blockedUserId, CancellationToken ct)
        {
            return await _db.Set<UserBlock>()
                .AsNoTracking()
                .AnyAsync(x => x.BlockerId == blockerId && x.BlockedUserId == blockedUserId, ct);
        }

        public async Task AddAsync(Guid blockerId, Guid blockedUserId, DateTimeOffset createdAt, CancellationToken ct)
        {
            var entity = new UserBlock
            {
                Id = Guid.NewGuid(),
                BlockerId = blockerId,
                BlockedUserId = blockedUserId,
                CreatedAt = createdAt
            };

            await _db.Set<UserBlock>().AddAsync(entity, ct);

            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                _db.Entry(entity).State = EntityState.Detached;
            }
        }

        private static bool IsUniqueViolation(DbUpdateException ex)
        {
            if (ex.InnerException is Npgsql.PostgresException pg)
            {
                return string.Equals(pg.SqlState, Npgsql.PostgresErrorCodes.UniqueViolation, StringComparison.Ordinal);
            }

            return false;
        }
    }
}
