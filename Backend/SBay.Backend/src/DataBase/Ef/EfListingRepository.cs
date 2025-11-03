using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using NpgsqlTypes;
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Entities;

namespace SBay.Domain.Database
{
    public sealed class EfListingRepository : IListingRepository, IReadStore<Listing>, IWriteStore<Listing>
    {
        private readonly EfDbContext _db;
        public EfListingRepository(EfDbContext db) => _db = db;

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

        public async Task<IReadOnlyList<Listing>> GetBySellerAsync(Guid sellerId, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                .AsNoTracking()
                .Where(l => l.SellerId == sellerId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery q, CancellationToken ct)
        {
            q ??= new();
            var text = (q.Text ?? string.Empty).Trim();
            var page = q.Page <= 0 ? 1 : q.Page;
            var size = q.PageSize is < 1 or > 100 ? 24 : q.PageSize;
            var skip = (page - 1) * size;

            var query = _db.Listings.AsNoTracking();

            if (!string.IsNullOrEmpty(q.Category)) query = query.Where(l => l.CategoryPath == q.Category);
            if (q.MinPrice.HasValue)
            {
                var minPrice = q.MinPrice.Value;
                query = query.Where(l => l.Price.Amount >= minPrice);
            }
            if (q.MaxPrice.HasValue)
            {
                var maxPrice = q.MaxPrice.Value;
                query = query.Where(l => l.Price.Amount <= maxPrice);
            }
            if (!string.IsNullOrEmpty(q.Region)) query = query.Where(l => l.Region == q.Region);

            if (!string.IsNullOrWhiteSpace(text))
            {
                // Build a tsquery on the server (choose one):
                var tsq = EF.Functions.PlainToTsQuery("simple", text);
                // var tsq = EF.Functions.WebSearchToTsQuery("simple", text); // nicer syntax: quotes, OR, -

                // Matches() translates to “@@”
                query = query.Where(l => EF.Property<object>(l, "SearchVec").Matches(tsq));

                // Optional: boost exact title hits with ILIKE
                string pattern = "%" + text.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_") + "%";
                query = query
                    .OrderByDescending(l =>
                        ts_rank_cd(search_vec, tsq, 32),
                        EF.Functions.TsRankCd(
                            EF.Property<object>(l, "SearchVec"), tsq, 32)
                        + (EF.Functions.ILike(l.Title, pattern, @"\") ? 1.5 : 0))
                    .ThenByDescending(l => l.CreatedAt);
            }
            else
            {
                query = query.OrderByDescending(l => l.CreatedAt);
            }

            return await query.Skip(skip).Take(size).ToListAsync(ct);
        }

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