using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using SBay.Backend.APIs.Records.Responses;

public class ListingsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;

    public ListingsControllerTests(TestWebAppFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false
        });

        // Use your fake auth scheme; parameter can be anything (or null) depending on your handler
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
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
            condition = "New",                       // <- string, not enum
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

        // Images & thumbnail
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
            // title missing
            description = "No title here",
            priceAmount = 0m,     // invalid
            priceCurrency = "",
        };

        var response = await _client.PostAsJsonAsync("/api/listings", bad);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
