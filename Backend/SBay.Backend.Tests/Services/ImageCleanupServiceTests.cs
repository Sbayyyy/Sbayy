using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SBay.Backend.Services;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;

namespace SBay.Backend.Tests.Services;

public sealed class ImageCleanupServiceTests : IDisposable
{
    private readonly string _uploadsRoot = Path.Combine(Path.GetTempPath(), $"sbay-cleanup-{Guid.NewGuid():N}");

    [Fact]
    public async Task CleanupAsync_ProtectsReferencedImages_DeletesOnlyOldUnreferencedImages()
    {
        Directory.CreateDirectory(_uploadsRoot);
        var old = DateTime.UtcNow.AddHours(-80);
        var recent = DateTime.UtcNow.AddHours(-1);

        CreateFile("thumb.jpg", old);
        CreateFile("listing.jpg", old);
        CreateFile("avatar.jpg", old);
        CreateFile("ad.jpg", old);
        CreateFile("evidence.jpg", old);
        CreateFile("old-unreferenced.jpg", old);
        CreateFile("recent-unreferenced.jpg", recent);
        CreateFile("traversal.jpg", old);

        await using var db = CreateDb();
        var seller = new User
        {
            Id = Guid.NewGuid(),
            Email = "seller@example.com",
            PasswordHash = "$",
            AvatarUrl = "/uploads/avatar.jpg"
        };
        var listing = new Listing(
            seller.Id,
            "Phone",
            "Used phone",
            new Money(10, "SYP"),
            thumb: "/uploads/thumb.jpg");
        listing.Images.Add(new ListingImage(listing.Id, "https://api.syrian-bay.com/uploads/listing.jpg", 0));

        db.Users.Add(seller);
        db.Listings.Add(listing);
        db.SponsoredAds.Add(new SponsoredAd
        {
            ImageUrl = "https://api.syrian-bay.com/uploads/ad.jpg",
            Title = "Ad",
            Description = "Ad",
            TargetUrl = "/"
        });
        db.Reports.Add(new Report
        {
            Id = Guid.NewGuid(),
            ReporterId = seller.Id,
            TargetId = listing.Id,
            TargetType = ReportTargetType.Listing,
            Reason = ReportReason.Other,
            EvidenceUrls = new[] { "/uploads/evidence.jpg", "/uploads/../traversal.jpg", "/uploads/missing.jpg" }
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);
        var dryRun = await service.CleanupAsync(dryRun: true, graceHours: 72, CancellationToken.None);

        dryRun.TotalFiles.Should().Be(8);
        dryRun.ReferencedFiles.Should().Be(5);
        dryRun.UnreferencedCandidateFiles.Should().Be(2);
        dryRun.DeletedFiles.Should().Be(0);
        File.Exists(Path.Combine(_uploadsRoot, "old-unreferenced.jpg")).Should().BeTrue();

        var deleted = await service.CleanupAsync(dryRun: false, graceHours: 72, CancellationToken.None);

        deleted.DeletedFiles.Should().Be(2);
        File.Exists(Path.Combine(_uploadsRoot, "thumb.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "listing.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "avatar.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "ad.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "evidence.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "recent-unreferenced.jpg")).Should().BeTrue();
        File.Exists(Path.Combine(_uploadsRoot, "old-unreferenced.jpg")).Should().BeFalse();
        File.Exists(Path.Combine(_uploadsRoot, "traversal.jpg")).Should().BeFalse();
    }

    public void Dispose()
    {
        if (Directory.Exists(_uploadsRoot))
            Directory.Delete(_uploadsRoot, recursive: true);
    }

    private void CreateFile(string relativePath, DateTime lastWriteUtc)
    {
        var fullPath = Path.Combine(_uploadsRoot, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllBytes(fullPath, new byte[] { 1, 2, 3 });
        File.SetLastWriteTimeUtc(fullPath, lastWriteUtc);
    }

    private EfDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<EfDbContext>()
            .UseInMemoryDatabase($"image-cleanup-{Guid.NewGuid():N}")
            .Options;
        return new EfDbContext(options);
    }

    private ImageCleanupService CreateService(EfDbContext db)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:Local:Path"] = _uploadsRoot,
                ["Storage:Local:PublicBaseUrl"] = "https://api.syrian-bay.com/uploads",
                ["App:PublicBaseUrl"] = "https://api.syrian-bay.com"
            })
            .Build();
        var environment = new Mock<IWebHostEnvironment>();
        environment.SetupGet(e => e.ContentRootPath).Returns(_uploadsRoot);
        return new ImageCleanupService(db, configuration, environment.Object, NullLogger<ImageCleanupService>.Instance);
    }
}
