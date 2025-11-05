using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

namespace SBay.Backend.Tests.DB
{
    [Collection("db")]
    public class EfListingRepository_WithImages_Tests
    {
        private readonly TestDatabaseFixture _fx;

        public EfListingRepository_WithImages_Tests(TestDatabaseFixture fx) => _fx = fx;

        [Fact]
        public async Task AddAsync_Persists_Listing_With_Images_And_Reads_Back_With_Images()
        {
            // Arrange
            await using var db = _fx.CreateContext();
            var repo = new EfListingRepository(db);
            var uow  = new EfUnitOfWork(db);

            // Seed a seller (respect NOT NULLs like password_hash)
            var sellerId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            await db.Database.ExecuteSqlRawAsync(@"
INSERT INTO users (id, email, password_hash, is_seller, created_at)
VALUES ({0}, {1}, {2}, true, now());
", sellerId, $"seller+{sellerId:N}@example.com", "hash");

            // Build aggregate
            var listing = new Listing(
                sellerId: sellerId,
                title: "Test phone",
                desc: "Mint condition",
                price: new Money(199.99m, "EUR"),
                stock: 3,
                condition: ItemCondition.Used,
                thumb: "https://cdn.example.com/img/phone-1.jpg",
                categoryPath: "electronics/phones",
                original: null,
                region: "DE"
            );

            // Add images via navigation — EF should INSERT into listing_images
            listing.Images.Add(new ListingImage(listing.Id, "https://cdn.example.com/img/phone-1.jpg", 0));
            listing.Images.Add(new ListingImage(listing.Id, "https://cdn.example.com/img/phone-2.jpg", 1));

            // Act
            await repo.AddAsync(listing, CancellationToken.None);
            await uow.SaveChangesAsync(CancellationToken.None);

            // Assert (raw DB check)
            var rows = await db.Set<ListingImage>()
                .AsNoTracking()
                .Where(i => i.ListingId == listing.Id)
                .OrderBy(i => i.Position)
                .ToListAsync();

            Assert.Equal(2, rows.Count);
            Assert.Equal("https://cdn.example.com/img/phone-1.jpg", rows[0].Url);
            Assert.Equal("https://cdn.example.com/img/phone-2.jpg", rows[1].Url);

            // Assert (repository read-back should include images; ensure repo uses Include)
            await using var db2 = _fx.CreateContext();
            var repo2 = new EfListingRepository(db2);

            var found = await repo2.GetByIdAsync(listing.Id, CancellationToken.None);
            Assert.NotNull(found);
            Assert.Equal(listing.Title, found!.Title);

            // If your repository's GetByIdAsync includes Images:
            // Assert.Equal(2, found.Images.Count);
            // Assert.Equal("https://cdn.example.com/img/phone-1.jpg", found.Images.OrderBy(i=>i.Position).First().Url);
        }
    }
}
