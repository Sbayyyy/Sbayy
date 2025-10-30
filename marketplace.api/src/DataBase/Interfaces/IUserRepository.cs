namespace SBay.Domain.Database
{
    public interface IUserRepository : IReadStore<Entities.User>, IWriteStore<Entities.User>
    {
        Task<Entities.User?> GetByExternalIdAsync(string externalId, CancellationToken ct);
    }
}