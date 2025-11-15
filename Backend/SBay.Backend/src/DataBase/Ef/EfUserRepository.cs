using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public class EfUserRepository : IUserRepository
    {
        private EfDbContext _db;

        public EfUserRepository(EfDbContext dbContext)
        {
            this._db = dbContext;
        }

        public async Task AddAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                await _db.Set<User>().AddAsync(entity, ct);
            }
            catch (Exception ex)
            {
                throw new Exception("Error adding User", ex);
            }
        }

        public async Task<bool> ExistAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<User>().AsNoTracking().AnyAsync(l => l.Id == id, ct);
        }

        public async Task<User?> GetByExternalIdAsync(string externalId, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(externalId)) return null;
            return await _db.Set<User>()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.ExternalId == externalId, ct);
        }

        public async Task<User> GetByIdAsync(Guid id, CancellationToken ct)
        {
            return await _db.Set<User>()
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == id, ct);
        }

        public async Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            return await _db.Set<User>()
                .FirstOrDefaultAsync(u => u.Email == email, ct);
        }

        public async Task<bool> EmailExistsAsync(string email, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            return await _db.Set<User>()
                .AsNoTracking()
                .AnyAsync(u => u.Email == email, ct);
        }

        public Task RemoveAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                _db.Set<User>().Remove(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error removing User", ex);
            }
        }

        public Task UpdateAsync(User entity, CancellationToken ct)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            try
            {
                _db.Set<User>().Update(entity);
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new Exception("Error updating User", ex);
            }
        }
    }
}
