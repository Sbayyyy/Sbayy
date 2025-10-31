
namespace SBay.Domain.Database
{
    public interface ICartRepository : IReadStore<Entities.Cart>, IWriteStore<Entities.Cart>
    {
        Task<Entities.Cart?> GetByUserIdAsync(Guid userId, CancellationToken ct);
    }
}