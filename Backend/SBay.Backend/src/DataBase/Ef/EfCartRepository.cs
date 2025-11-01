using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfCartRepository : ICartRepository
    {
        private EfDbContext _db;

        public EfCartRepository(EfDbContext dbContext)
        {
            this._db = dbContext;
        }

        public async Task AddAsync(ShoppingCart entity, CancellationToken ct)
        {
            try
            {
                await _db.Set<ShoppingCart>().AddAsync(entity, ct);
            }
            catch (Exception ex)
            {
                throw new Exception("Error adding ShoppingCart", ex);
            }
        }

        public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<ShoppingCart>().AsNoTracking().AnyAsync(l => l.Id == id, ct);
        }

        public async Task<ShoppingCart> GetByIdAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<ShoppingCart>()
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == id, ct);
        }

        public Task<ShoppingCart?> GetByUserIdAsync(Guid userId, CancellationToken ct)
        {
            throw new NotImplementedException();
        }

        public Task RemoveAsync(ShoppingCart entity, CancellationToken ct)
        {
            try
            {
                _db.Set<ShoppingCart>().Remove(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error removing ShoppingCart", ex);
            }
        }

        public Task UpdateAsync(ShoppingCart entity, CancellationToken ct)
        {
            try
            {
                _db.Set<ShoppingCart>().Update(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error updating ShoppingCart", ex);
            }
        }
    }
}
