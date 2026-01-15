using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database;

public class EfOrderRepository : IOrderRepository
{
    private readonly EfDbContext _db;
    public EfOrderRepository(EfDbContext db) => _db = db;

    public async Task<Order?> GetWithItemsAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Order>()
            .Include(o => o.Items)
            .Include(o => o.ShippingAddress)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }

    public async Task<(IReadOnlyList<Order> Orders, int Total)> GetByBuyerAsync(Guid buyerId, int page, int pageSize, CancellationToken ct)
    {
        var query = _db.Set<Order>()
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.ShippingAddress)
            .Where(o => o.BuyerId == buyerId);

        var total = await query.CountAsync(ct);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (orders, total);
    }

    public async Task<(IReadOnlyList<Order> Orders, int Total)> GetBySellerAsync(Guid sellerId, int page, int pageSize, CancellationToken ct)
    {
        var query = _db.Set<Order>()
            .AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.ShippingAddress)
            .Where(o => o.SellerId == sellerId);

        var total = await query.CountAsync(ct);
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (orders, total);
    }

    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Order>()
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }

    public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
    {
        return await _db.Set<Order>().AsNoTracking().AnyAsync(o => o.Id == id, ct);
    }

    public async Task AddAsync(Order entity, CancellationToken ct)
    {
        await _db.Set<Order>().AddAsync(entity, ct);
    }

    public Task UpdateAsync(Order entity, CancellationToken ct)
    {
        _db.Set<Order>().Update(entity);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(Order entity, CancellationToken ct)
    {
        _db.Set<Order>().Remove(entity);
        return Task.CompletedTask;
    }
}
