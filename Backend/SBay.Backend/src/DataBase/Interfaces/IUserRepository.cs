namespace SBay.Domain.Database
{
    public interface IUserRepository : IReadStore<Entities.User>, IWriteStore<Entities.User>
    {
        Task<Entities.User?> GetByExternalIdAsync(string externalId, CancellationToken ct);
        Task<Entities.User?> GetByEmailAsync(string email, CancellationToken ct);
        Task<bool> EmailExistsAsync(string email, CancellationToken ct);
    }
}
