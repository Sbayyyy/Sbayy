using Microsoft.EntityFrameworkCore;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{


    public sealed class EfListingRepository : IListingRepository, IReadStore<Listing>, IWriteStore<Listing>
    {
        private readonly EfDbContext _db;
        public EfListingRepository(EfDbContext db) => _db = db;

        // ---- IReadStore<Listing> ----
        public async Task<Listing?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                            .AsNoTracking()
                            .FirstOrDefaultAsync(l => l.Id == id, ct);
        }

        public async Task<bool> ExistAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                            .AsNoTracking()
                            .AnyAsync(l => l.Id == id, ct);
        }

        // ---- IListingRepository ----
        public async Task<IReadOnlyList<Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                            .AsNoTracking()
                            .Where(l => l.SellerId == sellerId)
                            .OrderByDescending(l => l.CreatedAt)
                            .ToListAsync(ct);
        }

        // (Optional) If your IListingRepository also defines a Search method, keep it here:
        // public async Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery q, CancellationToken ct = default) { ... }

        // ---- IWriteStore<Listing> ----
        public async Task AddAsync(Listing entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            await _db.Set<Listing>().AddAsync(entity, ct);
        }

        public Task UpdateAsync(Listing entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            _db.Set<Listing>().Update(entity);
            return Task.CompletedTask;
        }

        public Task RemoveAsync(Listing entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            _db.Set<Listing>().Remove(entity);
            return Task.CompletedTask;
        }
    }

}