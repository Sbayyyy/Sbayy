namespace SBay.Domain.Database
{
    public interface IUserBlockRepository
    {
        Task<bool> IsBlockedAsync(Guid blockerId, Guid blockedUserId, CancellationToken ct);
        Task AddAsync(Guid blockerId, Guid blockedUserId, DateTimeOffset createdAt, CancellationToken ct);
    }
}
