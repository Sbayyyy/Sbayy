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
            .FirstOrDefaultAsync(o => o.Id == id, ct);
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
