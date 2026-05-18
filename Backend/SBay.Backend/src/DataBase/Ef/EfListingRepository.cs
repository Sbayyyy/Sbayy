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
                .Include(l => l.Images)
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == id && l.Status == "active" && l.StockQuantity > 0, ct);
        }

        public async Task<Listing?> GetByIdForManagementAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                .Include(l => l.Images)
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
                .Include(l => l.Images)
                .AsNoTracking()
                .Where(l => l.SellerId == sellerId && l.Status == "active" && l.StockQuantity > 0)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync(ct);
        }

        public async Task<IReadOnlyList<Listing>> GetBySellerForManagementAsync(Guid sellerId, CancellationToken ct = default)
        {
            return await _db.Set<Listing>()
                .Include(l => l.Images)
                .AsNoTracking()
                .Where(l => l.SellerId == sellerId && l.Status != "deleted")
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync(ct);
        }

public async Task<IReadOnlyList<Listing>> SearchAsync(ListingQuery q, CancellationToken ct)
{
    q ??= new();
    var text = (q.Text ?? string.Empty).Trim();
    var normalizedText = text.ToLowerInvariant();
    var page = q.Page <= 0 ? 1 : q.Page;
    var size = q.PageSize is < 1 or > 100 ? 24 : q.PageSize;
    var skip = (page - 1) * size;

    IQueryable<Listing> query = _db.Listings
        .AsNoTracking()
        .Where(l => l.Status == "active" && l.StockQuantity > 0);
    var isPostgres = _isPostgres;

    if (!string.IsNullOrEmpty(q.Category))
        query = query.Where(l => l.CategoryPath != null && l.CategoryPath.StartsWith(q.Category));

    if (q.MinPrice.HasValue)
        query = query.Where(l => l.Price.Amount >= q.MinPrice.Value);

    if (q.MaxPrice.HasValue)
        query = query.Where(l => l.Price.Amount <= q.MaxPrice.Value);

    if (!string.IsNullOrEmpty(q.Region))
        query = query.Where(l => l.Region == q.Region);

    if (!string.IsNullOrWhiteSpace(q.Condition))
    {
        var parsedCondition = ItemConditionExtensions.FromString(q.Condition);
        if (parsedCondition != ItemCondition.Unknown)
            query = query.Where(l => l.Condition == parsedCondition);
    }

    if (q.Featured)
    {
        var now = DateTime.UtcNow;
        query = query.Where(l => l.BoostedUntil != null && l.BoostedUntil > now);
    }

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
                    || EF.Functions.ILike(l.Title, patternContains, @"\")
                    || EF.Functions.ILike(l.Description, patternContains, @"\"))
                .OrderByDescending(l => EF.Functions.ILike(l.Title, patternStarts, @"\"))
                .ThenByDescending(l => EF.Functions.ILike(l.Title, patternContains, @"\"))
                .ThenBy(l => l.Title.ToLower().IndexOf(normalizedText))
                .ThenByDescending(l =>
                    EF.Property<NpgsqlTypes.NpgsqlTsVector>(l, "SearchVec")
                        .RankCoverDensity(EF.Functions.PlainToTsQuery("simple", text)))
                .ThenByDescending(l => l.BoostedUntil != null && l.BoostedUntil > DateTime.UtcNow)
                .ThenByDescending(l => l.CreatedAt);
        }
        else
        {
            var escaped = EscapeLike(text);
            var pattern = "%" + escaped.ToLowerInvariant() + "%";
            var startsPattern = escaped.ToLowerInvariant() + "%";
            query = query
                .Where(l =>
                    EF.Functions.Like(l.Title.ToLower(), pattern, @"\")
                    || EF.Functions.Like((l.Description ?? string.Empty).ToLower(), pattern, @"\"))
                .OrderByDescending(l => EF.Functions.Like(l.Title.ToLower(), startsPattern, @"\"))
                .ThenByDescending(l => EF.Functions.Like(l.Title.ToLower(), pattern, @"\"))
                .ThenBy(l => l.Title.ToLower().IndexOf(normalizedText))
                .ThenByDescending(l => l.BoostedUntil != null && l.BoostedUntil > DateTime.UtcNow)
                .ThenByDescending(l => l.CreatedAt);
        }
    }
    else
    {
        query = query
            .OrderByDescending(l => l.BoostedUntil != null && l.BoostedUntil > DateTime.UtcNow)
            .ThenByDescending(l => l.CreatedAt);
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
                .Include(l => l.Images)
                .AsNoTracking()
                .Where(l => idsArray.Contains(l.Id) && l.Status == "active" && l.StockQuantity > 0)
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
            _db.Entry(entity).State = EntityState.Modified;
            var priceEntry = _db.Entry(entity).Reference(l => l.Price).TargetEntry;
            if (priceEntry is not null)
                priceEntry.State = EntityState.Modified;

            if (entity.OriginalPrice is not null)
            {
                var originalPriceEntry = _db.Entry(entity).Reference(l => l.OriginalPrice).TargetEntry;
                if (originalPriceEntry is not null)
                    originalPriceEntry.State = EntityState.Modified;
            }

            foreach (var image in entity.Images)
                _db.Entry(image).State = EntityState.Detached;
            return Task.CompletedTask;
        }

        public async Task ReplaceImagesAsync(Listing entity, CancellationToken ct)
        {
            if (entity.Images == null) return;

            if (_db.Database.IsRelational())
            {
                await _db.Set<ListingImage>()
                    .Where(i => i.ListingId == entity.Id)
                    .ExecuteDeleteAsync(ct);
            }
            else
            {
                var existing = await _db.Set<ListingImage>()
                    .Where(i => i.ListingId == entity.Id)
                    .ToListAsync(ct);
                _db.Set<ListingImage>().RemoveRange(existing);
            }

            if (entity.Images.Count == 0) return;

            await _db.Set<ListingImage>().AddRangeAsync(entity.Images, ct);
        }

        public Task RemoveAsync(Listing entity, CancellationToken ct = default)
        {
            if (entity is null) throw new ArgumentNullException(nameof(entity));
            _db.Set<Listing>().Remove(entity);
            return Task.CompletedTask;
        }

        public async Task SoftDeleteAsync(Guid id, CancellationToken ct = default)
        {
            if (_db.Database.IsRelational())
            {
                await _db.Set<Listing>()
                    .Where(l => l.Id == id)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(l => l.Status, "deleted")
                        .SetProperty(l => l.UpdatedAt, DateTime.UtcNow), ct);
                return;
            }

            var listing = await _db.Set<Listing>().FirstOrDefaultAsync(l => l.Id == id, ct);
            if (listing is null) return;
            _db.Entry(listing).Property(l => l.Status).CurrentValue = "deleted";
            _db.Entry(listing).Property(l => l.UpdatedAt).CurrentValue = DateTime.UtcNow;
        }

        public async Task<bool> TryReserveStockAsync(IReadOnlyDictionary<Guid, int> quantitiesByListingId, CancellationToken ct)
        {
            if (quantitiesByListingId.Count == 0) return false;

            if (_db.Database.IsRelational())
            {
                var ownsTransaction = _db.Database.CurrentTransaction is null;
                await using var tx = ownsTransaction
                    ? await _db.Database.BeginTransactionAsync(ct)
                    : null;

                try
                {
                    foreach (var pair in quantitiesByListingId)
                    {
                        var affected = await _db.Set<Listing>()
                            .Where(l => l.Id == pair.Key && l.Status == "active" && l.StockQuantity >= pair.Value)
                            .ExecuteUpdateAsync(s => s
                                .SetProperty(l => l.StockQuantity, l => l.StockQuantity - pair.Value)
                                .SetProperty(l => l.UpdatedAt, DateTime.UtcNow), ct);
                        if (affected != 1)
                        {
                            if (tx is not null)
                                await tx.RollbackAsync(ct);
                            return false;
                        }
                    }

                    if (tx is not null)
                        await tx.CommitAsync(ct);
                    return true;
                }
                catch
                {
                    if (tx is not null)
                        await tx.RollbackAsync(ct);
                    throw;
                }
            }

            var ids = quantitiesByListingId.Keys.ToArray();
            var listings = await _db.Set<Listing>()
                .Where(l => ids.Contains(l.Id))
                .ToListAsync(ct);
            if (listings.Count != quantitiesByListingId.Count)
                return false;

            foreach (var listing in listings)
            {
                var quantity = quantitiesByListingId[listing.Id];
                if (listing.Status != "active" || listing.StockQuantity < quantity)
                    return false;
            }

            foreach (var listing in listings)
            {
                var quantity = quantitiesByListingId[listing.Id];
                _db.Entry(listing).Property(l => l.StockQuantity).CurrentValue = listing.StockQuantity - quantity;
                _db.Entry(listing).Property(l => l.UpdatedAt).CurrentValue = DateTime.UtcNow;
            }

            return true;
        }

        public async Task ReleaseStockAsync(IReadOnlyDictionary<Guid, int> quantitiesByListingId, CancellationToken ct)
        {
            if (quantitiesByListingId.Count == 0) return;

            if (_db.Database.IsRelational())
            {
                foreach (var pair in quantitiesByListingId)
                {
                    await _db.Set<Listing>()
                        .Where(l => l.Id == pair.Key)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(l => l.StockQuantity, l => l.StockQuantity + pair.Value)
                            .SetProperty(l => l.UpdatedAt, DateTime.UtcNow), ct);
                }

                return;
            }

            var ids = quantitiesByListingId.Keys.ToArray();
            var listings = await _db.Set<Listing>()
                .Where(l => ids.Contains(l.Id))
                .ToListAsync(ct);

            foreach (var listing in listings)
            {
                var quantity = quantitiesByListingId[listing.Id];
                _db.Entry(listing).Property(l => l.StockQuantity).CurrentValue = listing.StockQuantity + quantity;
                _db.Entry(listing).Property(l => l.UpdatedAt).CurrentValue = DateTime.UtcNow;
            }
        }
    }
}
