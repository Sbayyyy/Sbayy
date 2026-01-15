using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public interface IOrderRepository : IReadStore<Order>, IWriteStore<Order>
    {
        Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct);
        Task<(IReadOnlyList<Order> Orders, int Total)> GetByBuyerAsync(Guid buyerId, int page, int pageSize, CancellationToken ct);
        Task<(IReadOnlyList<Order> Orders, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct);
    }
}
