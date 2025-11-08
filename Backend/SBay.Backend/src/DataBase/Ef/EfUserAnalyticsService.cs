using System.Linq;
using Microsoft.EntityFrameworkCore;


using SBay.Backend.APIs.Records;
using SBay.Domain.Database;
using SBay.Domain.Entities;

public sealed class EfUserAnalyticsService : IUserAnalyticsService
{
    private readonly EfDbContext _db;
    public EfUserAnalyticsService(EfDbContext db) => _db = db;

    public async Task<UserStatsDto> GetStatsAsync(Guid userId, CancellationToken ct)
    {
        var listingsCount = await _db.Set<Listing>().AsNoTracking().CountAsync(l => l.SellerId == userId, ct);
        var activeListingsCount = await _db.Set<Listing>().AsNoTracking().CountAsync(l => l.SellerId == userId && l.Status == "active", ct);

        var ok = new[] { OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Completed };

        var orders = await _db.Set<Order>()
            .AsNoTracking()
            .Where(o => o.SellerId == userId && ok.Contains(o.Status))
            .Select(o => new { o.Id, o.TotalAmount })
            .ToListAsync(ct);

        var orderIds   = orders.Select(o => o.Id).ToArray();
        var ordersCount = orders.Count;
        var revenue     = orders.Sum(x => x.TotalAmount);

        var itemsSold = await _db.Set<OrderItem>()
            .AsNoTracking()
            .Where(oi => orderIds.Contains(oi.OrderId))
            .SumAsync(x => (int?)x.Quantity, ct) ?? 0;

        var aov = ordersCount == 0 ? 0 : revenue / ordersCount;

        return new UserStatsDto(listingsCount, activeListingsCount, ordersCount, itemsSold, revenue, aov);
    }

    public async Task<UserAnalyticsDto> GetAnalyticsAsync(Guid userId, DateTime from, DateTime to, string granularity, CancellationToken ct)
    {
        var ok = new[] { OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Completed };

        var orders = _db.Set<Order>().AsNoTracking();
        var items  = _db.Set<OrderItem>().AsNoTracking();

        var q = orders
            .Where(o => o.SellerId == userId && ok.Contains(o.Status) && o.CreatedAt >= from && o.CreatedAt < to)
            .Join(items, o => o.Id, oi => oi.OrderId, (o, oi) => new
            {
                o.Id,
                o.CreatedAt,
                oi.Quantity,
                oi.PriceAmount
            });

        
        var rows = await q.ToListAsync(ct);

        static DateTime StartOfIsoWeek(DateTime dt)
            => dt.Date.AddDays(-(((int)dt.DayOfWeek + 6) % 7)); 

        var grouped = granularity switch
        {
            "month" => rows.GroupBy(x => new DateTime(x.CreatedAt.Year, x.CreatedAt.Month, 1)),
            "week"  => rows.GroupBy(x => StartOfIsoWeek(x.CreatedAt)),
            _       => rows.GroupBy(x => x.CreatedAt.Date)
        };

        var series = grouped
            .Select(g => new PointDto(
                g.Key,
                g.Sum(x => x.Quantity),
                g.Sum(x => x.PriceAmount * x.Quantity),
                g.Select(x => x.Id).Distinct().Count()
            ))
            .OrderBy(p => p.Bucket)
            .ToList();

        var ordersCount = series.Sum(p => p.Orders);
        var itemsSold   = series.Sum(p => p.ItemsSold);
        var revenue     = series.Sum(p => p.Revenue);
        var aov         = ordersCount == 0 ? 0 : revenue / ordersCount;

        return new UserAnalyticsDto(itemsSold, revenue, ordersCount, aov, series);
    }
}
