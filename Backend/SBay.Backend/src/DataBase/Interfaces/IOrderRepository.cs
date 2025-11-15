using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IOrderRepository : IReadStore<Order>, IWriteStore<Order>
    {
        Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct);
    }
}
