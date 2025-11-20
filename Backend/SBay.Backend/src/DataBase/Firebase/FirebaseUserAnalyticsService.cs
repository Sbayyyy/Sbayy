using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Google.Cloud.Firestore;
using SBay.Backend.APIs.Records;
using SBay.Backend.DataBase.Firebase.Models;
using SBay.Backend.DataBase.Interfaces;
using SBay.Backend.Exceptions;
using SBay.Domain.Entities;

namespace SBay.Backend.DataBase.Firebase;

public sealed class FirebaseUserAnalyticsService : IUserAnalyticsService
{
    private readonly FirestoreDb _db;

    public FirebaseUserAnalyticsService(FirestoreDb db)
    {
        _db = db;
    }

    private static async Task<T> EnsureCompleted<T>(Task<T> task)
    {
        var result = await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
        return result;
    }

    private static async Task EnsureCompleted(Task task)
    {
        await task;
        if (!task.IsCompletedSuccessfully)
            throw new DatabaseException("Operation failed");
    }

    public async Task<UserStatsDto> GetStatsAsync(Guid userId, CancellationToken ct)
    {
        var listingsSnapshot = await EnsureCompleted(
            _db.Collection("listings")
               .WhereEqualTo("SellerId", userId)
               .GetSnapshotAsync(ct));

        var listings = listingsSnapshot.Documents
            .Where(d => d.Exists)
            .Select(d => d.ConvertTo<ListingDocument>()?.ToDomain())
            .Where(l => l != null)
            .Cast<Listing>()
            .ToList();

        var listingsCount = listings.Count;
        var activeListingsCount = listings.Count(l => l.Status == "active");

        var ok = new[] { OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Completed };

        var ordersSnapshot = await EnsureCompleted(
            _db.Collection("orders")
               .WhereEqualTo("SellerId", userId)
               .WhereIn("Status", ok.Cast<object>().ToList())
               .GetSnapshotAsync(ct));

        var orders = ordersSnapshot.Documents
            .Where(d => d.Exists)
            .Select(d => d.ConvertTo<OrderDocument>()?.ToDomain())
            .Where(o => o != null)
            .Cast<Order>()
            .ToList();

        var orderIds = orders.Select(o => o.Id).ToArray();
        var ordersCount = orders.Count;
        var revenue = orders.Sum(x => x.TotalAmount);

        var items = orderIds.Length == 0
            ? new List<OrderItem>()
            : await FetchOrderItemsAsync(orderIds, ct);

        var itemsSold = items.Sum(x => x.Quantity);
        var aov = ordersCount == 0 ? 0 : revenue / ordersCount;

        return new UserStatsDto(listingsCount, activeListingsCount, ordersCount, itemsSold, revenue, aov);
    }

    public async Task<UserAnalyticsDto> GetAnalyticsAsync(
        Guid userId,
        DateTime from,
        DateTime to,
        string granularity,
        CancellationToken ct)
    {
        var ok = new[] { OrderStatus.Paid, OrderStatus.Shipped, OrderStatus.Completed };

        var ordersQuery = _db.Collection("orders")
            .WhereEqualTo("SellerId", userId)
            .WhereIn("Status", ok.Cast<object>().ToList())
            .WhereGreaterThanOrEqualTo("CreatedAt", from)
            .WhereLessThan("CreatedAt", to);

        var ordersSnapshot = await EnsureCompleted(ordersQuery.GetSnapshotAsync(ct));

        var orders = ordersSnapshot.Documents
            .Where(d => d.Exists)
            .Select(d => d.ConvertTo<OrderDocument>()?.ToDomain())
            .Where(o => o != null)
            .Cast<Order>()
            .ToList();

        var orderIds = orders.Select(o => o.Id).ToArray();

        var items = orderIds.Length == 0
            ? new List<OrderItem>()
            : await FetchOrderItemsAsync(orderIds, ct);

        var rows = orders
            .Join(
                items,
                o => o.Id,
                oi => oi.OrderId,
                (o, oi) => new
                {
                    o.Id,
                    o.CreatedAt,
                    oi.Quantity,
                    oi.PriceAmount
                })
            .ToList();

        static DateTime StartOfIsoWeek(DateTime dt)
            => dt.Date.AddDays(-(((int)dt.DayOfWeek + 6) % 7));

        var grouped = granularity switch
        {
            "month" => rows.GroupBy(x => new DateTime(x.CreatedAt.Year, x.CreatedAt.Month, 1)),
            "week" => rows.GroupBy(x => StartOfIsoWeek(x.CreatedAt)),
            _ => rows.GroupBy(x => x.CreatedAt.Date)
        };

        var series = grouped
            .Select(g => new PointDto(
                g.Key,
                g.Sum(x => x.Quantity),
                g.Sum(x => x.PriceAmount * x.Quantity),
                g.Select(x => x.Id).Distinct().Count()))
            .OrderBy(p => p.Bucket)
            .ToList();

        var ordersCount = series.Sum(p => p.Orders);
        var itemsSold = series.Sum(p => p.ItemsSold);
        var revenue = series.Sum(p => p.Revenue);
        var aov = ordersCount == 0 ? 0 : revenue / ordersCount;

        return new UserAnalyticsDto(itemsSold, revenue, ordersCount, aov, series);
    }

    private async Task<List<OrderItem>> FetchOrderItemsAsync(Guid[] orderIds, CancellationToken ct)
    {
        const int chunkSize = 10;
        var items = new List<OrderItem>();
        for (int i = 0; i < orderIds.Length; i += chunkSize)
        {
            var chunk = orderIds.Skip(i).Take(chunkSize).Cast<object>().ToList();
            if (chunk.Count == 0) continue;
            var snapshot = await EnsureCompleted(
                _db.Collection("order_items")
                   .WhereIn("OrderId", chunk)
                   .GetSnapshotAsync(ct));

            items.AddRange(
                snapshot.Documents
                    .Where(d => d.Exists)
                    .Select(d => d.ConvertTo<OrderItemDocument>()?.ToDomain())
                    .Where(i => i != null)
                    .Cast<OrderItem>());
        }
        return items;
    }
}
