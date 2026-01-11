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
        private readonly bool _isPostgres;

        public EfListingRepository(EfDbContext db)
        {
            _db = db;
            var provider = _db.Model.FindAnnotation("Relational:ProviderName")?.Value?.ToString();
            _isPostgres = string.Equals(provider, DatabaseProviders.PostgresProviderName, StringComparison.Ordinal);
        }

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

    IQueryable<Listing> query = _db.Listings.AsNoTracking();
    var isPostgres = _isPostgres;

    if (!string.IsNullOrEmpty(q.Category))
        query = query.Where(l => l.CategoryPath == q.Category);

    if (q.MinPrice.HasValue)
        query = query.Where(l => l.Price.Amount >= q.MinPrice.Value);

    if (q.MaxPrice.HasValue)
        query = query.Where(l => l.Price.Amount <= q.MaxPrice.Value);

    if (!string.IsNullOrEmpty(q.Region))
        query = query.Where(l => l.Region == q.Region);

    if (!string.IsNullOrWhiteSpace(text))
    {
        if (isPostgres)
        {
            var escaped = EscapeLike(text);
            var patternContains = "%" + escaped + "%";
            var patternStarts   = escaped + "%";

            query = query
                .Where(l =>
                    EF.Property<NpgsqlTypes.NpgsqlTsVector>(l, "SearchVec")
                        .Matches(EF.Functions.PlainToTsQuery("simple", text))
                    || EF.Functions.ILike(l.Title, patternContains)
                    || EF.Functions.ILike(l.Description, patternContains))
                .OrderByDescending(l =>
                    EF.Property<NpgsqlTypes.NpgsqlTsVector>(l, "SearchVec")
                        .RankCoverDensity(EF.Functions.PlainToTsQuery("simple", text)))
                
                .ThenByDescending(l => EF.Functions.ILike(l.Title, patternStarts))
                .ThenByDescending(l => EF.Functions.ILike(l.Title, patternContains))
                .ThenByDescending(l => l.CreatedAt);
        }
        else
        {
            var escaped = EscapeLike(text);
            var pattern = "%" + escaped + "%";
            query = query
                .Where(l =>
                    EF.Functions.Like(l.Title, pattern, @"\")
                    || EF.Functions.Like(l.Description ?? string.Empty, pattern, @"\"))
                .OrderByDescending(l => l.CreatedAt);
        }
    }
    else
    {
        query = query.OrderByDescending(l => l.CreatedAt);
    }
 

    return await query.Skip(skip).Take(size).ToListAsync(ct);
}

        private static string EscapeLike(string input)
        {
            return input.Replace(@"\", @"\\")
                .Replace("%", @"\%")
                .Replace("_", @"\_");
        }
        public async Task<IReadOnlyList<Listing>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
        {
            var idsArray = ids?.Where(id => id != Guid.Empty).Distinct().ToArray() ?? Array.Empty<Guid>();
            if (idsArray.Length == 0) return Array.Empty<Listing>();
            return await _db.Set<Listing>()
                .AsNoTracking()
                .Where(l => idsArray.Contains(l.Id))
                .ToListAsync(ct);
        }

        public async Task<int> CountBySellerAsync(Guid sellerId, CancellationToken ct)
        {
            return await _db.Listings.AsNoTracking().CountAsync(l => l.SellerId == sellerId, ct);
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
