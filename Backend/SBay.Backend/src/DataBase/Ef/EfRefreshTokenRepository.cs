using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfRefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly EfDbContext _db;

        public EfRefreshTokenRepository(EfDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(RefreshToken token, CancellationToken ct)
        {
            await _db.Set<RefreshToken>().AddAsync(token, ct);
        }

        public async Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct)
        {
            return await _db.Set<RefreshToken>()
                .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);
        }

        public async Task RevokeAllForUserAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
        {
            var active = await _db.Set<RefreshToken>()
                .Where(x => x.UserId == userId && x.RevokedAt == null && x.ExpiresAt > now)
                .ToListAsync(ct);

            foreach (var token in active)
            {
                token.RevokedAt = now;
            }
        }
    }
}
