using Microsoft.EntityFrameworkCore;
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
            var exists = await _db.Set<UserBlock>()
                .AnyAsync(x => x.BlockerId == blockerId && x.BlockedUserId == blockedUserId, ct);
            if (exists) return;

            var entity = new UserBlock
            {
                Id = Guid.NewGuid(),
                BlockerId = blockerId,
                BlockedUserId = blockedUserId,
                CreatedAt = createdAt
            };
            await _db.Set<UserBlock>().AddAsync(entity, ct);
        }
    }
}
