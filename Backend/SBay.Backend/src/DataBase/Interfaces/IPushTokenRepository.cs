using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IPushTokenRepository
    {
        Task<IReadOnlyList<PushToken>> GetTokensAsync(Guid userId, CancellationToken ct);
        Task UpsertAsync(Guid userId, string token, string? platform, string? deviceId, DateTimeOffset now, CancellationToken ct);
        Task RemoveAsync(Guid userId, string token, CancellationToken ct);
    }
}
