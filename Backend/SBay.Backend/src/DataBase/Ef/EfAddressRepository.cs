using Microsoft.EntityFrameworkCore;
using SBay.Backend.DataBase.Interfaces;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Ef;

/// <summary>
/// Entity Framework implementation of IAddressRepository
/// </summary>
public sealed class EfAddressRepository : IAddressRepository
{
    private readonly EfDbContext _db;
    
    public EfAddressRepository(EfDbContext db)
    {
        _db = db;
    }
    
    public async Task<Address?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Set<Address>()
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct);
    }

    public async Task<IReadOnlyList<Address>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0)
            return Array.Empty<Address>();

        return await _db.Set<Address>()
            .AsNoTracking()
            .Where(a => idList.Contains(a.Id))
            .ToListAsync(ct);
    }
    
    public async Task<List<Address>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Set<Address>()
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);
    }
    
    public async Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Set<Address>()
            .AnyAsync(a => a.Id == id, ct);
    }
    
    public async Task AddAsync(Address address, CancellationToken ct = default)
    {
        await _db.Set<Address>().AddAsync(address, ct);
    }
    
    public async Task UpdateAsync(Address address, CancellationToken ct = default)
    {
        address.UpdatedAt = DateTime.UtcNow;
        _db.Set<Address>().Update(address);
    }
    
    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var address = await _db.Set<Address>()
            .FindAsync(new object[] { id }, ct);
        
        if (address != null)
        {
            _db.Set<Address>().Remove(address);
        }
    }
}
