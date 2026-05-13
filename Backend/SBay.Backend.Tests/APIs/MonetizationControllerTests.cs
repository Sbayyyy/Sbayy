using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.Api.Controllers;
using SBay.Backend.Services;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;

public class MonetizationControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public MonetizationControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Boost_ReturnsForbidden_WhenListingBelongsToAnotherSeller()
    {
        var listing = new Listing(Guid.NewGuid(), "Other listing", "desc", new Money(100, "SYP"));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Listings.Add(listing);
        await db.SaveChangesAsync();

        var client = AuthenticatedClient();
        var res = await client.PostAsJsonAsync($"/api/monetization/listings/{listing.Id}/boost", new
        {
            optionId = "boost_7",
            returnUrl = "/seller/my-listings"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task BoostOptions_Returns_Seven_Fourteen_And_Thirty_Day_Plans()
    {
        var client = _factory.CreateClient();

        var options = await client.GetFromJsonAsync<List<BoostOption>>("/api/monetization/boost-options");

        options.Should().NotBeNull();
        options!.Select(o => o.DurationDays).Should().Contain(new[] { 7, 14, 30 });
    }

    [Fact]
    public async Task Boost_ReturnsBadRequest_WhenListingIsHidden()
    {
        var listing = new Listing(TestAuthHandler.SellerId, "Hidden listing", "desc", new Money(100, "SYP"));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Listings.Add(listing);
        typeof(Listing).GetProperty(nameof(Listing.Status))!.SetValue(listing, "hidden");
        await db.SaveChangesAsync();

        var client = AuthenticatedClient();
        var res = await client.PostAsJsonAsync($"/api/monetization/listings/{listing.Id}/boost", new
        {
            optionId = "boost_7",
            returnUrl = "/seller/my-listings"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Webhook_ActivatesBoostOnlyAfterSucceededPayment_AndIsIdempotent()
    {
        var listing = new Listing(TestAuthHandler.SellerId, "Boostable listing", "desc", new Money(100, "SYP"));

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Listings.Add(listing);
        await db.SaveChangesAsync();

        var client = AuthenticatedClient();
        var create = await client.PostAsJsonAsync($"/api/monetization/listings/{listing.Id}/boost", new
        {
            optionId = "boost_7",
            returnUrl = "/seller/my-listings"
        });

        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var transaction = await create.Content.ReadFromJsonAsync<PaymentTransactionDto>();
        transaction.Should().NotBeNull();
        transaction!.Status.Should().Be(nameof(PaymentTransactionStatus.Pending));

        var firstWebhook = await client.PostAsJsonAsync("/api/payments/webhooks/mock", new
        {
            providerReference = transaction.ProviderReference,
            eventId = Guid.NewGuid().ToString("N"),
            status = "succeeded"
        });
        var duplicateWebhook = await client.PostAsJsonAsync("/api/payments/webhooks/mock", new
        {
            providerReference = transaction.ProviderReference,
            eventId = Guid.NewGuid().ToString("N"),
            status = "succeeded"
        });

        firstWebhook.StatusCode.Should().Be(HttpStatusCode.OK);
        duplicateWebhook.StatusCode.Should().Be(HttpStatusCode.OK);

        db.ChangeTracker.Clear();
        var saved = await db.Listings.FindAsync(listing.Id);
        saved!.BoostedUntil.Should().BeAfter(DateTime.UtcNow);
        db.ListingBoostPurchases.Count(b => b.ListingId == listing.Id && b.IsActive).Should().Be(1);
    }

    private HttpClient AuthenticatedClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "listings.write");
        return client;
    }
}
