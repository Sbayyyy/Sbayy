using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public class FirebaseRefreshTokenRepository : IRefreshTokenRepository
{
    public Task AddAsync(RefreshToken token, CancellationToken ct)
    {
        throw new NotImplementedException("Firestore refresh token storage is not implemented.");
    }

    public Task<RefreshToken?> GetByHashAsync(string tokenHash, CancellationToken ct)
    {
        throw new NotImplementedException("Firestore refresh token storage is not implemented.");
    }

    public Task RevokeAllForUserAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
    {
        throw new NotImplementedException("Firestore refresh token storage is not implemented.");
    }
}
