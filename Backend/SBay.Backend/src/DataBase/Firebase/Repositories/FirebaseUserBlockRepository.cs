using SBay.Domain.Database;

namespace SBay.Backend.DataBase.Firebase
{
    public class FirebaseUserBlockRepository : IUserBlockRepository
    {
        public Task<bool> IsBlockedAsync(Guid blockerId, Guid blockedUserId, CancellationToken ct)
        {
            throw new InvalidOperationException("Firestore user block storage is not implemented.");
        }

        public Task AddAsync(Guid blockerId, Guid blockedUserId, DateTimeOffset createdAt, CancellationToken ct)
        {
            throw new InvalidOperationException("Firestore user block storage is not implemented.");
        }
    }
}
