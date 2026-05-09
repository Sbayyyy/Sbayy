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
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

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
            Items: new[] { new CreateOrderItemReq(listing.Id, 1, 999m, "USD") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod"
        );

        var orderRes = await client.PostAsJsonAsync("/api/orders", orderReq);
        orderRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await orderRes.Content.ReadAsStringAsync();
        problem.Should().Contain("Buyer and seller cannot be the same user");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenMultipleSellers()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

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
            },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod"
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
            },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod"
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
            Items: new[] { new CreateOrderItemReq(Guid.NewGuid(), 1, 1m, "EUR") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod"
        );

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("unavailable");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenListingInactive()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var listing = new SBay.Domain.Entities.Listing(
            Guid.NewGuid(),
            "Hidden Item",
            "Hidden",
            new SBay.Domain.ValueObjects.Money(10m, "EUR"),
            stock: 1);
        db.Add(listing);
        db.Entry(listing).Property(l => l.Status).CurrentValue = "hidden";
        await db.SaveChangesAsync();

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(listing.Id, 1, 999m, "USD") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod");

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("unavailable");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenOutOfStock()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var listing = new SBay.Domain.Entities.Listing(
            Guid.NewGuid(),
            "Empty Item",
            "Empty",
            new SBay.Domain.ValueObjects.Money(10m, "EUR"),
            stock: 0);
        db.Add(listing);
        await db.SaveChangesAsync();

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(listing.Id, 1, 999m, "USD") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod");

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("unavailable");
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenQuantityExceedsStock()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var listing = new SBay.Domain.Entities.Listing(
            Guid.NewGuid(),
            "Limited Item",
            "Limited",
            new SBay.Domain.ValueObjects.Money(10m, "EUR"),
            stock: 1);
        db.Add(listing);
        await db.SaveChangesAsync();

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(listing.Id, 2, 1m, "EUR") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod");

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().Contain("exceeds available stock");
    }

    [Fact]
    public async Task CreateOrder_UsesServerTotals_And_DecrementsStock()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var listing = new SBay.Domain.Entities.Listing(
            Guid.NewGuid(),
            "Real Price Item",
            "Real Price",
            new SBay.Domain.ValueObjects.Money(12.50m, "EUR"),
            stock: 3);
        db.Add(listing);
        await db.SaveChangesAsync();

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(listing.Id, 2, 0.01m, "USD") },
            SavedAddressId: null,
            NewAddress: null,
            PaymentMethod: "cod");

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await res.Content.ReadFromJsonAsync<OrderDto>();
        dto.Should().NotBeNull();
        dto!.TotalAmount.Should().Be(25m);
        dto.TotalCurrency.Should().Be("EUR");
        dto.Items.Single().PriceAmount.Should().Be(12.50m);
        dto.Items.Single().PriceCurrency.Should().Be("EUR");

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var saved = await verifyDb.Listings.FindAsync(listing.Id);
        saved!.StockQuantity.Should().Be(1);
    }

    [Fact]
    public async Task UpdateStatus_RejectsInvalidJumps_And_IsIdempotent()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var seller = await db.Users.FindAsync(TestAuthHandler.SellerId) ?? new SBay.Domain.Entities.User
        {
            Id = TestAuthHandler.SellerId,
            Email = $"seller.{Guid.NewGuid():N}@example.com",
            PasswordHash = "$",
            Role = "seller"
        };
        seller.PendingOrders = 1;
        seller.TotalOrders = 0;
        seller.TotalRevenue = 0;
        var order = new SBay.Domain.Entities.Order
        {
            Id = Guid.NewGuid(),
            BuyerId = Guid.NewGuid(),
            SellerId = seller.Id,
            Status = SBay.Domain.Entities.OrderStatus.Pending,
            TotalAmount = 20m,
            TotalCurrency = "EUR"
        };
        if (db.Entry(seller).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            db.Add(seller);
        db.Add(order);
        await db.SaveChangesAsync();

        var invalid = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "completed" });
        invalid.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var paid = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "paid" });
        paid.StatusCode.Should().Be(HttpStatusCode.OK);
        var shipped = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "shipped" });
        shipped.StatusCode.Should().Be(HttpStatusCode.OK);
        var completed = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "completed" });
        completed.StatusCode.Should().Be(HttpStatusCode.OK);
        var completedAgain = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "completed" });
        completedAgain.StatusCode.Should().Be(HttpStatusCode.OK);
        var cancelledAfterComplete = await client.PatchAsJsonAsync($"/api/orders/{order.Id}/status", new UpdateOrderStatusRequest { Status = "cancelled" });
        cancelledAfterComplete.StatusCode.Should().Be(HttpStatusCode.Conflict);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var updatedSeller = await verifyDb.Users.FindAsync(seller.Id);
        updatedSeller!.PendingOrders.Should().Be(0);
        updatedSeller.TotalOrders.Should().Be(1);
        updatedSeller.TotalRevenue.Should().Be(20m);
    }

    [Fact]
    public async Task Cancel_PendingOrder_RestoresStock()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "orders.write");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var seller = new SBay.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = $"seller.cancel.{Guid.NewGuid():N}@example.com",
            PasswordHash = "$",
            Role = "seller",
            PendingOrders = 1
        };
        var listing = new SBay.Domain.Entities.Listing(
            seller.Id,
            "Reserved Item",
            "Reserved",
            new SBay.Domain.ValueObjects.Money(20m, "EUR"),
            stock: 0);
        var order = new SBay.Domain.Entities.Order
        {
            Id = Guid.NewGuid(),
            BuyerId = TestAuthHandler.SellerId,
            SellerId = seller.Id,
            Status = SBay.Domain.Entities.OrderStatus.Pending,
            TotalAmount = 20m,
            TotalCurrency = "EUR"
        };
        order.Items.Add(new SBay.Domain.Entities.OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            ListingId = listing.Id,
            Quantity = 1,
            PriceAmount = 20m,
            PriceCurrency = "EUR"
        });
        db.Add(seller);
        db.Add(listing);
        db.Add(order);
        await db.SaveChangesAsync();

        var res = await client.DeleteAsync($"/api/orders/{order.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<SBay.Domain.Database.EfDbContext>();
        var savedListing = await verifyDb.Listings.FindAsync(listing.Id);
        var savedOrder = await verifyDb.Set<SBay.Domain.Entities.Order>().FindAsync(order.Id);
        var savedSeller = await verifyDb.Users.FindAsync(seller.Id);
        savedListing!.StockQuantity.Should().Be(1);
        savedOrder!.Status.Should().Be(SBay.Domain.Entities.OrderStatus.Cancelled);
        savedSeller!.PendingOrders.Should().Be(0);
    }

    [Fact]
    public async Task CreateOrder_Fails_WhenNewAddressMissingFields()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");

        var orderReq = new CreateOrderReq(
            SellerId: Guid.Empty,
            Items: new[] { new CreateOrderItemReq(Guid.NewGuid(), 1, 1m, "EUR") },
            SavedAddressId: null,
            NewAddress: new SaveAddressRequest(
                Name: "",
                Phone: " ",
                Street: "",
                City: "",
                Region: null),
            PaymentMethod: "cod"
        );

        var res = await client.PostAsJsonAsync("/api/orders", orderReq);
        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var msg = await res.Content.ReadAsStringAsync();
        msg.Should().Contain("Name, phone, street, and city are required");
    }
}
