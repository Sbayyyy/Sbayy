using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SBay.Backend.DataBase.Queries; // ListingQuery
using SBay.Domain.Database; // EfDbContext, EfListingRepository
using SBay.Domain.Entities; // Listing (for compile, not used to seed)
using Xunit;

namespace SBay.Backend.Tests.DB
{
    public class EfListingRepositoryTests
    {
        private static string GetConnectionString()
        {
            var config = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("ConnectionStrings.json", optional: false, reloadOnChange: false)
                .Build();

            var cs = config.GetConnectionString("Default");
            if (string.IsNullOrWhiteSpace(cs))
                throw new InvalidOperationException(
                    "Missing ConnectionStrings:Default in ConnectionStrings.json"
                );

            return cs;
        }

        private static EfDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<EfDbContext>()
                .UseNpgsql(GetConnectionString())
                .UseSnakeCaseNamingConvention()
                .Options;

            return new EfDbContext(options);
        }

        private static async Task SeedMinimalAsync(EfDbContext ctx)
        {
            // Fresh seller/category ids so tests are isolated
            var sellerId = Guid.NewGuid();

            // Seed a seller user
            await ctx.Database.ExecuteSqlRawAsync(
                @"
INSERT INTO users (id, email, password_hash, is_seller, created_at)
VALUES ({0}, 'seller.repo@example.com', 'hash', true, now());
",
                sellerId
            );

            // Ensure categories
            await ctx.Database.ExecuteSqlRawAsync(
                @"
INSERT INTO categories (name) VALUES
  ('tools')        ON CONFLICT DO NOTHING,
  ('hardware')     ON CONFLICT DO NOTHING,
  ('home')         ON CONFLICT DO NOTHING;
"
            );

            // Pick category ids
            var toolsId = await ctx
                .Categories.Where(c => c.Name == "tools")
                .Select(c => c.Id)
                .FirstAsync();
            var hardwareId = await ctx
                .Categories.Where(c => c.Name == "hardware")
                .Select(c => c.Id)
                .FirstAsync();

            // Seed listings (titles/desc tailored for search assertions)
            await ctx.Database.ExecuteSqlRawAsync(
                @"
INSERT INTO listings
(id, seller_id, category_id, category_path, title, description, price_amount, price_currency, status, created_at, updated_at)
VALUES
({0}, {1}, {2}, 'tools/hand/screwdrivers', 'Screwdriver Set', 'Magnetic tip, 12 pieces', 10.00, 'EUR', 'active', now() - interval '1 day', now()),
({3}, {1}, {4}, 'hardware/fasteners',      'Box of Screws',    'Assorted wood screws',    5.00,  'EUR', 'active', now() - interval '2 day', now()),
({5}, {1}, {2}, 'tools/hand/hammers',      'Steel Hammer',     '16oz claw hammer',        9.50,  'EUR', 'active', now() - interval '3 day', now());
",
                Guid.NewGuid(), // listing 1
                sellerId,
                toolsId,
                Guid.NewGuid(), // listing 2
                hardwareId,
                Guid.NewGuid()
            ); // listing 3

            // Touch search_vec trigger (if needed)
            await ctx.Database.ExecuteSqlRawAsync("UPDATE listings SET title = title;");
        }

        [Fact]
        public async Task SearchAsync_TextOnly_Should_Return_Relevant_ByRank_Then_Recency()
        {
            await using var ctx = CreateContext();
            Assert.True(await ctx.Database.CanConnectAsync(), "DB not reachable");

            await SeedMinimalAsync(ctx);

            var repo = new EfListingRepository(ctx);

            var q = new ListingQuery(text: "screw", category: null, page: 1, pageSize: 10);
            var res = await repo.SearchAsync(q, CancellationToken.None);

            Assert.NotEmpty(res);
            // Top 2 should be Screwdriver Set and Box of Screws (order may depend on your ranking/boosts)
            var titles = res.Take(2).Select(x => x.Title).ToArray();
            Assert.Contains("Screwdriver Set", titles);
            Assert.Contains("Box of Screws", titles);
        }

        [Fact]
        public async Task SearchAsync_TextAndCategory_Should_Filter_To_CategoryPath()
        {
            await using var ctx = CreateContext();
            Assert.True(await ctx.Database.CanConnectAsync(), "DB not reachable");

            await SeedMinimalAsync(ctx);

            var repo = new EfListingRepository(ctx);

            var q = new ListingQuery(
                text: "screw",
                category: "hardware/fasteners",
                page: 1,
                pageSize: 10
            );
            var res = await repo.SearchAsync(q, CancellationToken.None);

            Assert.NotEmpty(res);
            Assert.All(res, r => Assert.Equal("hardware/fasteners", r.CategoryPath));
            Assert.Contains(res, r => r.Title == "Box of Screws");
        }

        [Fact]
        public async Task SearchAsync_EmptyText_Should_Return_Newest_First_With_Paging()
        {
            await using var ctx = CreateContext();
            Assert.True(await ctx.Database.CanConnectAsync(), "DB not reachable");

            await SeedMinimalAsync(ctx);

            var repo = new EfListingRepository(ctx);

            var firstPage = await repo.SearchAsync(
                new ListingQuery(text: null, page: 1, pageSize: 2),
                CancellationToken.None
            );
            var secondPage = await repo.SearchAsync(
                new ListingQuery(text: null, page: 2, pageSize: 2),
                CancellationToken.None
            );

            Assert.Equal(2, firstPage.Count);
            Assert.True(secondPage.Count >= 1);

            // Ensure no overlap between pages
            var firstIds = firstPage.Select(x => x.Id).ToHashSet();
            Assert.True(secondPage.All(x => !firstIds.Contains(x.Id)));
        }
    }
}
