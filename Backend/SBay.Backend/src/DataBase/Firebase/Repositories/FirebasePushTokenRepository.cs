using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebasePushTokenRepository : IPushTokenRepository
    {
        public Task<IReadOnlyList<PushToken>> GetTokensAsync(Guid userId, CancellationToken ct)
        {
            return Task.FromResult<IReadOnlyList<PushToken>>(Array.Empty<PushToken>());
        }

        public Task UpsertAsync(Guid userId, string token, string? platform, string? deviceId, DateTimeOffset now, CancellationToken ct)
        {
            return Task.CompletedTask;
        }

        public Task RemoveAsync(Guid userId, string token, CancellationToken ct)
        {
            return Task.CompletedTask;
        }
    }
}
