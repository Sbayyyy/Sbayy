using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebasePushTokenRepository : IPushTokenRepository
    {
        public Task<IReadOnlyList<PushToken>> GetTokensAsync(Guid userId, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore push token storage is not implemented.");
        }

        public Task UpsertAsync(Guid userId, string token, string? platform, string? deviceId, DateTimeOffset now, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore push token storage is not implemented.");
        }

        public Task RemoveAsync(Guid userId, string token, CancellationToken ct)
        {
            throw new NotImplementedException("Firestore push token storage is not implemented.");
        }
    }
}
