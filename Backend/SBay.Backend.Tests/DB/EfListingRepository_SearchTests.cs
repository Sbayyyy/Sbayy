using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SBay.Backend.DataBase.Queries;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

namespace SBay.Backend.Tests.DB
{
    [Collection("db")]
    public class EfListingRepository_SearchTests : DBScopedTest
    {
        private readonly TestDatabaseFixture _fx;

        public EfListingRepository_SearchTests(TestDatabaseFixture fx) : base(fx) => _fx = fx;

        // Ensures there's a seller row that satisfies FK listings.seller_id -> users(id)
        private static async Task<Guid> EnsureSellerAsync(EfDbContext ctx, string email = "seller.repos@example.com")
        {
            var existing = await ctx.Users
                .Where(u => u.Email == email)
                .Select(u => u.Id)
                .FirstOrDefaultAsync();

            if (existing != Guid.Empty)
                return existing;

            var newId = Guid.NewGuid();
            var rows = await ctx.Database.ExecuteSqlRawAsync(@"
INSERT INTO users (id, email, password_hash, is_seller, created_at)
VALUES ({0}, {1}, {2}, TRUE, now())
ON CONFLICT (email) DO NOTHING;",
                newId, email, "$test_hash");

            // If inserted by us, return the id we used
            if (rows > 0)
                return newId;

            // Otherwise, someone else inserted it between SELECT and INSERT — re-read safely
            var id = await ctx.Users
                .Where(u => u.Email == email)
                .Select(u => u.Id)
                .FirstOrDefaultAsync();

            if (id == Guid.Empty)
                throw new InvalidOperationException("Failed to ensure seller row; users(email) not found after insert attempt.");

            return id;
        }

        private static async Task SeedSampleAsync(EfDbContext ctx)
        {
            // Clean in dependency-safe way
            await ctx.Database.ExecuteSqlRawAsync(@"
TRUNCATE TABLE
    order_items,
    orders,
    cart_items,
    carts,
    listing_images,
    listings
RESTART IDENTITY CASCADE;");

            var sellerId = await EnsureSellerAsync(ctx);

            ctx.AddRange(
                new Listing(
                    sellerId: sellerId,
                    title   : "Apple iPhone 12 64GB",
                    desc    : "Blue, good condition, original box",
                    price   : new Money(450m, "EUR"),
                    stock   : 1,
                    condition: ItemCondition.Used,
                    categoryPath: "electronics/mobiles",
                    region  : "BW"
                ),
                new Listing(
                    sellerId: sellerId,
                    title   : "Case for iPhone 12",
                    desc    : "Silicone cover suitable for Apple phones",
                    price   : new Money(15m, "EUR"),
                    categoryPath: "electronics/accessories",
                    region  : "BW"
                ),
                new Listing(
                    sellerId: sellerId,
                    title   : "Samsung Galaxy S21",
                    desc    : "Excellent battery life, great camera",
                    price   : new Money(390m, "EUR"),
                    categoryPath: "electronics/mobiles",
                    region  : "BY"
                )
            );

            await ctx.SaveChangesAsync();
        }

        [Fact]
        public async Task Search_FTS_and_TitleBoost_Should_Order_Correctly()
        {
            await using var db = _fx.CreateContext();
            await SeedSampleAsync(db);

            var repo = new EfListingRepository(db);

            var q = new ListingQuery
            {
                Text = "iphone 12",
                Page = 1,
                PageSize = 50
            };

            var results = await repo.SearchAsync(q, CancellationToken.None);

            results.Should().NotBeEmpty();
            results.Should().OnlyContain(r => !r.Title.Contains("Samsung", StringComparison.OrdinalIgnoreCase));
            results[0].Title.Should().StartWith("Apple iPhone 12");
        }

        [Fact]
        public async Task Search_Filters_Category_MinPrice_Should_Work()
        {
            await using var db = _fx.CreateContext();
            await SeedSampleAsync(db);

            var repo = new EfListingRepository(db);

            var q = new ListingQuery
            {
                Text = "iphone",
                Category = "electronics/mobiles",
                MinPrice = 400m,
                Page = 1,
                PageSize = 50
            };

            var results = await repo.SearchAsync(q, CancellationToken.None);

            results.Should().HaveCount(1);
            results[0].CategoryPath.Should().Be("electronics/mobiles");
            results[0].Price.Amount.Should().BeGreaterThanOrEqualTo(400m);
        }

        [Fact]
        public async Task Search_Paging_Should_Return_Disjoint_Pages()
        {
            await using var db = _fx.CreateContext();

            // Clean before paging seed
            await db.Database.ExecuteSqlRawAsync(@"
TRUNCATE TABLE
    order_items,
    orders,
    cart_items,
    carts,
    listing_images,
    listings
RESTART IDENTITY CASCADE;");

            var sellerId = await EnsureSellerAsync(db);

            for (int i = 0; i < 60; i++)
            {
                db.Add(new Listing(
                    sellerId: sellerId,
                    title   : $"Test Phone {i}",
                    desc    : i % 2 == 0 ? "iphone" : "samsung",
                    price   : new Money(100m + i, "EUR"),
                    categoryPath: "electronics/mobiles",
                    region  : "BW"
                ));
            }
            await db.SaveChangesAsync();

            var repo = new EfListingRepository(db);

            var q1 = new ListingQuery { Text = "phone", Page = 1, PageSize = 24 };
            var q2 = new ListingQuery { Text = "phone", Page = 2, PageSize = 24 };

            var p1 = await repo.SearchAsync(q1, CancellationToken.None);
            var p2 = await repo.SearchAsync(q2, CancellationToken.None);

            p1.Count.Should().Be(24);
            p2.Count.Should().Be(24);

            var ids1 = p1.Select(x => x.Id).ToHashSet();
            p2.Should().OnlyContain(x => !ids1.Contains(x.Id));
        }
    }
}
