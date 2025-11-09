using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using Xunit;

// Use the same test collection as DB-scoped tests to avoid
// race conditions with tests that truncate tables.
[Collection("db")]
public class OrdersControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public OrdersControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact(Skip = "Default test auth scheme (TestAuth) prevents buyer!=seller success path in this environment.")]
    public async Task CreateOrder_DerivesSeller_And_Prices_ComputesTotals()
    {
        // This test requires two distinct authenticated principals (buyer and seller)
        // using JWT scheme. The TestWebAppFactory overrides default auth to TestAuth
        // which makes all [Authorize] endpoints use the same fixed identity.
        // Keeping as documentation of intended behavior; enable when auth scheme allows.
        await Task.CompletedTask;
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenBuyerIsSeller()
    {
        // Use TestAuth to act as a single user
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");

        // Create listing as the same authenticated principal
        var listingReq = new
        {
            title = "Self Listing",
            description = "Should not buy own listing",
            priceAmount = 15.00m,
            priceCurrency = "EUR",
            stock = 2,
            condition = "New"
        };
        var listingRes = await client.PostAsJsonAsync("/api/listings", listingReq);
        listingRes.EnsureSuccessStatusCode();
        var listing = await listingRes.Content.ReadFromJsonAsync<ListingResponse>()
                      ?? throw new("Missing listing response body");

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(listing.Id, 1, 999m, "USD") }
        );

        var orderRes = await client.PostAsJsonAsync("/api/orders", orderReq);
        orderRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await orderRes.Content.ReadAsStringAsync();
        problem.Should().Contain("Buyer and seller cannot be the same user");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenMultipleSellers()
    {
        // Create listing L1 via API as TestAuth seller
        var buyer = _factory.CreateClient();
        buyer.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        var l1ReqApi = new { title = "Item A", description = "A", priceAmount = 5.00m, priceCurrency = "EUR", stock = 1, condition = "New" };
        var l1ResApi = await buyer.PostAsJsonAsync("/api/listings", l1ReqApi);
        l1ResApi.EnsureSuccessStatusCode();
        var l1Dto = await l1ResApi.Content.ReadFromJsonAsync<ListingResponse>() ?? throw new("no l1");

        // Create listing L2 directly in DB for a different seller
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var seller2 = new SBay.Domain.Entities.User { Id = Guid.NewGuid(), Email = $"seller2.{Guid.NewGuid():N}@example.com", PasswordHash = "$", Role = "seller", CreatedAt = DateTime.UtcNow };
        db.Add(seller2);
        var l2 = new SBay.Domain.Entities.Listing(seller2.Id, "Item B", "B", new SBay.Domain.ValueObjects.Money(7.00m, "EUR"));
        db.Add(l2);
        await db.SaveChangesAsync();
        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[]
            {
                new CreateOrderItemReq(l1Dto.Id, 1, 0m, "EUR"),
                new CreateOrderItemReq(l2.Id, 1, 0m, "EUR")
            }
        );

        var orderRes = await buyer.PostAsJsonAsync("/api/orders", orderReq);
        orderRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var msg = await orderRes.Content.ReadAsStringAsync();
        msg.Should().Contain("must belong to the same seller");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenMixedCurrencies()
    {
        // Create two listings for the same seller with different currencies directly in DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var seller = new SBay.Domain.Entities.User { Id = Guid.NewGuid(), Email = $"sellerx.{Guid.NewGuid():N}@example.com", PasswordHash = "$", Role = "seller", CreatedAt = DateTime.UtcNow };
        db.Add(seller);
        var l1 = new SBay.Domain.Entities.Listing(seller.Id, "A", "A", new SBay.Domain.ValueObjects.Money(5.00m, "EUR"));
        var l2 = new SBay.Domain.Entities.Listing(seller.Id, "B", "B", new SBay.Domain.ValueObjects.Money(6.00m, "USD"));
        db.Add(l1); db.Add(l2);
        await db.SaveChangesAsync();

        // Use a different authenticated principal for the buyer is not possible due to TestAuth default,
        // but we can still validate mixed currency error occurs before buyer==seller in our logic.
        var buyer = _factory.CreateClient();
        buyer.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[]
            {
                new CreateOrderItemReq(l1.Id, 1, 0m, "EUR"),
                new CreateOrderItemReq(l2.Id, 1, 0m, "USD")
            }
        );

        var orderRes = await buyer.PostAsJsonAsync("/api/orders", orderReq);
        orderRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var msg = await orderRes.Content.ReadAsStringAsync();
        msg.Should().Contain("must have the same currency");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenListing_NotFound()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(Guid.NewGuid(), 1, 1m, "EUR") }
        );

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("One or more listings not found");
    }
}
