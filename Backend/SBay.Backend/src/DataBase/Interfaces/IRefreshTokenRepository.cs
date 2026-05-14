using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IRefreshTokenRepository
    {
        Task AddAsync(RefreshToken token, CancellationToken ct);
        Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct);
        Task RevokeAllForUserAsync(Guid userId, DateTimeOffset now, CancellationToken ct);
    }
}
