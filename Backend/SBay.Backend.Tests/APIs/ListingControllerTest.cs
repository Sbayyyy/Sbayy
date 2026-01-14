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
                "https://cdn.example.com/img/phone1-1.jpg",
                "https://cdn.example.com/img/phone1-2.jpg"
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

        
        result.ImageUrls.Should().NotBeNull();
        result.ImageUrls!.Count.Should().Be(2);
        result.ImageUrls[0].Should().Be("https://cdn.example.com/img/phone1-1.jpg");
        result.ImageUrls[1].Should().Be("https://cdn.example.com/img/phone1-2.jpg");
        result.ThumbnailUrl.Should().Be("https://cdn.example.com/img/phone1-1.jpg");
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
            imageUrls = new[] { "https://cdn.example.com/img/phone2.jpg" }
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
            imageUrls = new[] { "https://cdn.example.com/img/phone3.jpg" }
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
        results.All(r => r.Condition == ItemCondition.Used).Should().BeTrue();
    }
}
