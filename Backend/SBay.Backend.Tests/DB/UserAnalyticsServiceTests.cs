using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.APIs.Records;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

namespace SBay.Backend.Tests.DB
{
    [Collection("db")]
    public sealed class EfUserAnalyticsServiceTests : DBScopedTest
    {
        public EfUserAnalyticsServiceTests(TestDatabaseFixture fx) : base(fx) { }

        private static async Task<Guid> EnsureUserAsync(EfDbContext db, string email, bool isSeller)
        {
            var existing = await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstOrDefaultAsync();
            if (existing != Guid.Empty) return existing;

            var id = Guid.NewGuid();
            await db.Database.ExecuteSqlRawAsync(@"
INSERT INTO users (id, email, password_hash, display_name, role, is_seller, created_at)
VALUES ({0}, {1}, 'hash', {2}, {3}, {4}, now())
ON CONFLICT (email) DO NOTHING;",
                id, email, isSeller ? "Seller" : "Buyer", isSeller ? "seller" : "user", isSeller);

            var ensured = await db.Users.Where(u => u.Email == email).Select(u => u.Id).FirstOrDefaultAsync();
            return ensured != Guid.Empty ? ensured : id;
        }

        private static async Task SeedAnalyticsDataAsync(EfDbContext db, Guid sellerId, Guid buyerId)
        {
            await db.Database.ExecuteSqlRawAsync(@"
TRUNCATE TABLE order_items, orders, cart_items, carts, listing_images, listings RESTART IDENTITY CASCADE;");

            var l1 = new Listing(
                sellerId: sellerId,
                title: "Analytics Phone A",
                desc: "A",
                price: new Money(100m, "SYP"),
                stock: 5,
                condition: ItemCondition.New,
                categoryPath: "electronics/phones",
                region: "BW"
            );
            var l2 = new Listing(
                sellerId: sellerId,
                title: "Analytics Phone B",
                desc: "B",
                price: new Money(200m, "SYP"),
                stock: 5,
                condition: ItemCondition.New,
                categoryPath: "electronics/phones",
                region: "BW"
            );

            db.AddRange(l1, l2);
            await db.SaveChangesAsync();

            var listing1Id = await db.Listings.Where(x => x.Title == "Analytics Phone A").Select(x => x.Id).FirstAsync();
            var listing2Id = await db.Listings.Where(x => x.Title == "Analytics Phone B").Select(x => x.Id).FirstAsync();

            var o1 = Guid.NewGuid();
            var o2 = Guid.NewGuid();

            await db.Database.ExecuteSqlRawAsync(@"
INSERT INTO orders (id, buyer_id, seller_id, status, total_amount, total_currency, created_at, updated_at)
VALUES
({0}, {1}, {2}, 'paid',      100.00, 'SYP', now() - interval '2 day', now() - interval '2 day'),
({3}, {1}, {2}, 'completed', 400.00, 'SYP', now() - interval '1 day', now() - interval '1 day');",
                o1, buyerId, sellerId, o2);

            await db.Database.ExecuteSqlRawAsync(@"
INSERT INTO order_items (id, order_id, listing_id, quantity, price_amount, price_currency)
VALUES
(gen_random_uuid(), {0}, {1}, 1, 100.00, 'SYP'),
(gen_random_uuid(), {2}, {3}, 2, 200.00, 'SYP');",
                o1, listing1Id, o2, listing2Id);
        }

        [Fact]
        public async Task GetStatsAsync_Computes_Aggregates()
        {
            await using var db = Fx.CreateContext();
            var sellerId = await EnsureUserAsync(db, $"seller.analytics+{Guid.NewGuid():N}@example.com", true);
            var buyerId = await EnsureUserAsync(db, $"buyer.analytics+{Guid.NewGuid():N}@example.com", false);
            await SeedAnalyticsDataAsync(db, sellerId, buyerId);

            var svc = new EfUserAnalyticsService(db);
            var dto = await svc.GetStatsAsync(sellerId, CancellationToken.None);

            dto.OrdersCount.Should().Be(2);
            dto.ItemsSold.Should().Be(3);
            dto.Revenue.Should().Be(500m);
            dto.Aov.Should().Be(250m);
            dto.ListingsCount.Should().BeGreaterThanOrEqualTo(2);
            dto.ActiveListingsCount.Should().BeGreaterThan(0);
        }

        [Theory]
        [InlineData("day")]
        [InlineData("week")]
        [InlineData("month")]
        public async Task GetAnalyticsAsync_Returns_Sane_Series(string granularity)
        {
            await using var db = Fx.CreateContext();
            var sellerId = await EnsureUserAsync(db, $"seller.analytics+{Guid.NewGuid():N}@example.com", true);
            var buyerId = await EnsureUserAsync(db, $"buyer.analytics+{Guid.NewGuid():N}@example.com", false);
            await SeedAnalyticsDataAsync(db, sellerId, buyerId);

            var from = DateTime.UtcNow.AddDays(-7);
            var to = DateTime.UtcNow.AddDays(1);

            var svc = new EfUserAnalyticsService(db);
            var dto = await svc.GetAnalyticsAsync(sellerId, from, to, granularity, CancellationToken.None);

            dto.OrdersCount.Should().Be(2);
            dto.ItemsSold.Should().Be(3);
            dto.Revenue.Should().Be(500m);
            dto.Series.Should().NotBeEmpty();
            dto.Series.Should().BeInAscendingOrder(p => p.Bucket);
            dto.Series.Sum(p => p.ItemsSold).Should().Be(3);
            dto.Series.Sum(p => p.Revenue).Should().Be(500m);
            dto.Series.Sum(p => p.Orders).Should().Be(2);
        }
    }
}
