
namespace SBay.Domain.Database
{
    public interface ICartRepository : IReadStore<Entities.ShoppingCart>, IWriteStore<Entities.ShoppingCart>
    {
        Task<Entities.ShoppingCart?> GetByUserIdAsync(Guid userId, CancellationToken ct);
    }
}