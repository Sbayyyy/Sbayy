using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

namespace SBay.Backend.Tests.APIs;

public class PlatformControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;
    private readonly HttpClient _client;

    public PlatformControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private sealed record PlatformStatsDto(
        int RegisteredUsers,
        int ActiveListings,
        int CoveredRegions,
        int CompletedTransactions);

    [Fact]
    public async Task Stats_Should_Return_Public_Live_Aggregates()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        var sellerId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        db.Users.AddRange(
            new User
            {
                Id = sellerId,
                Email = "platform.seller@example.com",
                PasswordHash = "$",
                Role = "seller",
                Status = "active",
                IsSeller = true,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = buyerId,
                Email = "platform.buyer@example.com",
                PasswordHash = "$",
                Role = "user",
                Status = "active",
                CreatedAt = DateTime.UtcNow
            });

        var hiddenListing = new Listing(sellerId, "Hidden", "Not active", new Money(10m, "EUR"), categoryPath: "other", region: "homs");
        hiddenListing.SetStatus("hidden");
        db.Listings.AddRange(
            new Listing(sellerId, "Phone", "Active listing", new Money(100m, "EUR"), categoryPath: "electronics", region: "damascus"),
            new Listing(sellerId, "Chair", "Active listing", new Money(50m, "EUR"), categoryPath: "home", region: "aleppo"),
            hiddenListing);

        db.Set<Order>().AddRange(
            new Order { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, Status = OrderStatus.Completed, TotalAmount = 100m },
            new Order { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, Status = OrderStatus.Pending, TotalAmount = 50m });

        await db.SaveChangesAsync();

        var response = await _client.GetAsync("/api/platform/stats");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<PlatformStatsDto>();
        body.Should().NotBeNull();
        body!.RegisteredUsers.Should().Be(2);
        body.ActiveListings.Should().Be(2);
        body.CoveredRegions.Should().Be(2);
        body.CompletedTransactions.Should().Be(1);
    }
}
