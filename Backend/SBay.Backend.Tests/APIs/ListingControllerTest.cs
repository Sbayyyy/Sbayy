using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;
using Xunit;
using SBay.Backend.APIs.Records.Responses;

public class ListingsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;
    private readonly HttpClient _client;

    public ListingsControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
    }

    private async Task SeedListingsAsync(params Listing[] listings)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
        db.Listings.AddRange(listings);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task PostListing_ShouldReturnCreated_WithImages()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

        var request = new
        {
            title = "Test Phone 1",
            description = "Brand new test listing",
            priceAmount = 100.00m,
            priceCurrency = "EUR",
            stock = 2,
            condition = "New",                       
            categoryPath = "electronics/mobiles",
            region = "BW",
            imageUrls = new[]
            {
                "/uploads/phone1-1.jpg",
                "/uploads/phone1-2.jpg"
            }
        };

        var response = await _client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<ListingResponse>();
        result.Should().NotBeNull();
        result!.Title.Should().Be("Test Phone 1");
        result.PriceAmount.Should().Be(100.00m);
        result.PriceCurrency.Should().Be("EUR");
        result.Stock.Should().Be(2);
        result.Condition.ToString().Should().Be("New");
        result.IsBoosted.Should().BeFalse();
        result.BoostedUntil.Should().BeNull();

        
        result.ImageUrls.Should().NotBeNull();
        result.ImageUrls!.Count.Should().Be(2);
        result.ImageUrls[0].Should().Be("/uploads/phone1-1.jpg");
        result.ImageUrls[1].Should().Be("/uploads/phone1-2.jpg");
        result.ThumbnailUrl.Should().Be("/uploads/phone1-1.jpg");
    }

    [Fact]
    public async Task PostListing_ShouldAccept_AnyNonNegativePrice()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

        var request = new
        {
            title = "Custom Price Item",
            description = "Listing with a custom non-rounded price",
            priceAmount = 12001m,
            priceCurrency = "EUR",
            stock = 1,
            condition = "New",
            categoryPath = "electronics",
            region = "BW"
        };

        var response = await _client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var result = await response.Content.ReadFromJsonAsync<ListingResponse>();
        result!.PriceAmount.Should().Be(12001m);
    }

    [Fact]
    public async Task PostListing_ShouldReject_NegativePrice()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

        var request = new
        {
            title = "Negative Price Item",
            description = "Listing with an invalid negative price",
            priceAmount = -1m,
            priceCurrency = "EUR",
            stock = 1,
            condition = "New",
            categoryPath = "electronics",
            region = "BW"
        };

        var response = await _client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostListing_ShouldFail_WhenMissingRequiredFields()
    {
        var bad = new
        {
            
            description = "No title here",
            priceAmount = 0m,     
            priceCurrency = "",
        };

        var response = await _client.PostAsJsonAsync("/api/listings", bad);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PostListing_ShouldReturnForbidden_WhenMissingListingWriteScope()
    {
        _client.DefaultRequestHeaders.Remove("X-Test-Role");
        _client.DefaultRequestHeaders.Remove("X-Test-IsSeller");
        _client.DefaultRequestHeaders.Add("X-Test-Role", "user");
        _client.DefaultRequestHeaders.Add("X-Test-IsSeller", "false");

        var request = new
        {
            title = "Test Phone 2",
            description = "Brand new test listing",
            priceAmount = 120.00m,
            priceCurrency = "EUR",
            stock = 2,
            condition = "New",
            categoryPath = "electronics/mobiles",
            region = "BW",
            imageUrls = new[] { "/uploads/phone2.jpg" }
        };

        var response = await _client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task PostListing_ShouldReturnUnauthorized_WhenAnonymous()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        var request = new
        {
            title = "Test Phone 3",
            description = "Brand new test listing",
            priceAmount = 120.00m,
            priceCurrency = "EUR",
            stock = 2,
            condition = "New",
            categoryPath = "electronics/mobiles",
            region = "BW",
            imageUrls = new[] { "/uploads/phone3.jpg" }
        };

        var response = await client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Search_ShouldFail_WhenPageIsOutOfRange()
    {
        var response = await _client.GetAsync("/api/listings?page=0");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Page must be");
    }

    [Fact]
    public async Task Search_ShouldFail_WhenPageSizeIsOutOfRange()
    {
        var response = await _client.GetAsync("/api/listings?page=1&pageSize=1000");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("PageSize must be");
    }

    [Fact]
    public async Task Search_Should_Filter_By_Category()
    {
        await SeedListingsAsync(
            new Listing(Guid.NewGuid(), "Phone", "desc", new Money(100m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.New),
            new Listing(Guid.NewGuid(), "Shirt", "desc", new Money(50m, "EUR"), categoryPath: "fashion", region: "Damascus", condition: ItemCondition.Used));

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings?category=electronics");

        results.Should().NotBeNull();
        results!.Should().HaveCount(1);
        results.All(r => r.CategoryPath == "electronics").Should().BeTrue();
    }

    [Fact]
    public async Task Search_Should_Filter_By_Region()
    {
        await SeedListingsAsync(
            new Listing(Guid.NewGuid(), "Phone", "desc", new Money(100m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.New),
            new Listing(Guid.NewGuid(), "Shirt", "desc", new Money(50m, "EUR"), categoryPath: "fashion", region: "Aleppo", condition: ItemCondition.Used));

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings?region=Damascus");

        results.Should().NotBeNull();
        results!.Should().HaveCount(1);
        results.All(r => r.Region == "Damascus").Should().BeTrue();
    }

    [Fact]
    public async Task Search_Should_Filter_By_Price_Range()
    {
        await SeedListingsAsync(
            new Listing(Guid.NewGuid(), "Phone", "desc", new Money(100m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.New),
            new Listing(Guid.NewGuid(), "Shirt", "desc", new Money(50m, "EUR"), categoryPath: "fashion", region: "Damascus", condition: ItemCondition.Used),
            new Listing(Guid.NewGuid(), "Tablet", "desc", new Money(180m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.Used));

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings?minPrice=80&maxPrice=150");

        results.Should().NotBeNull();
        results!.Should().HaveCount(1);
        results.All(r => r.PriceAmount >= 80m && r.PriceAmount <= 150m).Should().BeTrue();
    }

    [Fact]
    public async Task Search_Should_Filter_By_Condition()
    {
        await SeedListingsAsync(
            new Listing(Guid.NewGuid(), "Phone", "desc", new Money(100m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.New),
            new Listing(Guid.NewGuid(), "Shirt", "desc", new Money(50m, "EUR"), categoryPath: "fashion", region: "Damascus", condition: ItemCondition.Used),
            new Listing(Guid.NewGuid(), "Tablet", "desc", new Money(180m, "EUR"), categoryPath: "electronics", region: "Damascus", condition: ItemCondition.Used));

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings?condition=Used");

        results.Should().NotBeNull();
        results!.Should().HaveCount(2);
        results.All(r => r.Condition == ItemCondition.Used.ToString()).Should().BeTrue();
    }

    [Fact]
    public async Task Search_Should_Filter_By_Featured()
    {
        var boosted = new Listing(Guid.NewGuid(), "Boosted", "desc", new Money(100m, "EUR"));
        var normal = new Listing(Guid.NewGuid(), "Normal", "desc", new Money(50m, "EUR"));
        boosted.ActivateBoost(DateTime.UtcNow.AddDays(2));

        await SeedListingsAsync(boosted, normal);

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings?featured=true");

        results.Should().NotBeNull();
        results!.Should().ContainSingle();
        results[0].Id.Should().Be(boosted.Id);
        results[0].IsBoosted.Should().BeTrue();
    }

    [Fact]
    public async Task Search_Should_Only_Return_Active_Stocked_Listings()
    {
        var active = new Listing(Guid.NewGuid(), "Active", "desc", new Money(100m, "EUR"), stock: 1);
        var soldOut = new Listing(Guid.NewGuid(), "Sold Out", "desc", new Money(100m, "EUR"), stock: 0);
        var hidden = new Listing(Guid.NewGuid(), "Hidden", "desc", new Money(100m, "EUR"), stock: 1);

        await SeedListingsAsync(active, soldOut, hidden);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            var hiddenEntity = await db.Listings.FindAsync(hidden.Id);
            db.Entry(hiddenEntity!).Property(l => l.Status).CurrentValue = "hidden";
            await db.SaveChangesAsync();
        }

        var results = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings");

        results.Should().NotBeNull();
        results!.Select(r => r.Id).Should().BeEquivalentTo(new[] { active.Id });
    }

    [Fact]
    public async Task GetById_Should_Not_Expose_Inactive_PublicListing()
    {
        var hidden = new Listing(Guid.NewGuid(), "Hidden", "desc", new Money(100m, "EUR"), stock: 1);
        await SeedListingsAsync(hidden);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            var hiddenEntity = await db.Listings.FindAsync(hidden.Id);
            db.Entry(hiddenEntity!).Property(l => l.Status).CurrentValue = "hidden";
            await db.SaveChangesAsync();
        }

        var res = await _client.GetAsync($"/api/listings/{hidden.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_Should_Expose_Inactive_Listing_ToOwner()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);
        var hidden = new Listing(TestAuthHandler.SellerId, "Hidden owner item", "desc", new Money(100m, "EUR"), stock: 1);
        await SeedListingsAsync(hidden);
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            var hiddenEntity = await db.Listings.FindAsync(hidden.Id);
            db.Entry(hiddenEntity!).Property(l => l.Status).CurrentValue = "hidden";
            await db.SaveChangesAsync();
        }

        var res = await _client.GetAsync($"/api/listings/{hidden.Id}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<ListingResponse>();
        body!.Id.Should().Be(hidden.Id);
    }

    [Fact]
    public async Task PutListing_Should_Update_Price_Without_Replacing_Existing_Images()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

        var create = new
        {
            title = "Priced item",
            description = "Item with images",
            priceAmount = 100m,
            priceCurrency = "SYP",
            stock = 1,
            condition = "New",
            categoryPath = "electronics",
            region = "Damascus",
            imageUrls = new[] { "/uploads/priced-item.jpg" }
        };
        var createdResponse = await _client.PostAsJsonAsync("/api/listings", create);
        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createdResponse.Content.ReadFromJsonAsync<ListingResponse>();
        created.Should().NotBeNull();

        var update = new
        {
            priceAmount = 125m
        };
        var updateResponse = await _client.PutAsJsonAsync($"/api/listings/{created!.Id}", update);

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ListingResponse>();
        updated!.PriceAmount.Should().Be(125m);
        updated.ImageUrls.Should().BeEquivalentTo(created.ImageUrls, options => options.WithStrictOrdering());

        var reloadedResponse = await _client.GetAsync($"/api/listings/{created.Id}");
        reloadedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var reloaded = await reloadedResponse.Content.ReadFromJsonAsync<ListingResponse>();
        reloaded!.PriceAmount.Should().Be(125m);
        reloaded.ImageUrls.Should().BeEquivalentTo(created.ImageUrls, options => options.WithStrictOrdering());
    }

    [Fact]
    public async Task PutListing_Should_Mark_Listing_As_Sold()
    {
        await TestUsers.EnsureDefaultSellerAsync(_factory.Services);

        var create = new
        {
            title = "Sold item",
            description = "Item that has been sold",
            priceAmount = 100m,
            priceCurrency = "SYP",
            stock = 1,
            condition = "New",
            categoryPath = "electronics",
            region = "Damascus"
        };
        var createdResponse = await _client.PostAsJsonAsync("/api/listings", create);
        createdResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await createdResponse.Content.ReadFromJsonAsync<ListingResponse>();
        created.Should().NotBeNull();

        var updateResponse = await _client.PutAsJsonAsync($"/api/listings/{created!.Id}", new { status = "sold" });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ListingResponse>();
        updated!.Status.Should().Be("sold");

        var searchResults = await _client.GetFromJsonAsync<List<ListingResponse>>("/api/listings");
        searchResults!.Select(item => item.Id).Should().NotContain(created.Id);

        var publicClient = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });
        var publicResponse = await publicClient.GetAsync($"/api/listings/{created.Id}");
        publicResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
