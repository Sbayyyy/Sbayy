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

        public Task<IReadOnlyList<Listing>> SearchAsync(string? text, string? category, int page, int size, CancellationToken ct) =>
            SearchAsync(new ListingQuery(text, category, page, size), ct);

        public async Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery listingQuery, CancellationToken ct)
        {
            listingQuery ??= new();
            var text = (listingQuery.Text ?? "").Trim();
            var page = listingQuery.Page <= 0 ? 1 : listingQuery.Page;
            var size = listingQuery.PageSize is < 1 or > 100 ? 24 : listingQuery.PageSize;
            var skip = (page - 1) * size;

            const string sql = @"
WITH q AS (
  SELECT plainto_tsquery('simple', @p0) AS tsq,
         @p0::text AS raw
)
SELECT l.*
FROM public.listings l, q
WHERE (@p1 IS NULL OR l.category_path = @p1)
  AND (@p2 IS NULL OR l.price_amount >= @p2)
  AND (@p3 IS NULL OR l.price_amount <= @p3)
  AND (
        (q.tsq != ''::tsquery AND q.tsq @@ l.search_vec)
        OR l.title ILIKE '%' || q.raw || '%'
        OR l.description ILIKE '%' || q.raw || '%'
      )
ORDER BY
  (
    CASE WHEN q.tsq != ''::tsquery
         THEN ts_rank_cd(l.search_vec, q.tsq, 32)
         ELSE 0
    END
    + CASE WHEN l.title ILIKE '%' || q.raw || '%' THEN 1.5 ELSE 0 END
  ) DESC,
  l.created_at DESC
OFFSET @p4 LIMIT @p5;
";

            return await _db.Listings
                .FromSqlRaw(sql,
                    text,
                    (object?)listingQuery.Category ?? DBNull.Value,
                    (object?)listingQuery.MinPrice ?? DBNull.Value,
                    (object?)listingQuery.MaxPrice ?? DBNull.Value,
                    skip, size)
                .AsNoTracking()
                .ToListAsync(ct);
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