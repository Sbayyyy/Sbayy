using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using SBay.Backend.APIs.Records;
using SBay.Domain.Entities; // for ItemCondition enum

public class ListingsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;


    public ListingsControllerTests(TestWebAppFactory factory)
    {
        _client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false // avoids header loss on redirects
        });
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(TestAuthHandler.SchemeName);
    }

    [Fact]
    public async Task PostListing_ShouldReturnCreated()
    {
        var request = new
        {
            title = "Test Phone 1",
            description = "Brand new test listing",
            priceAmount = 100.00m,
            priceCurrency = "EUR",
            stock = 2,
            condition = ItemCondition.New,
            categoryPath = "electronics/mobiles",
            region = "BW"
        };

        var response = await _client.PostAsJsonAsync("/api/listings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<ListingResponse>();
        result!.Title.Should().Be("Test Phone 1");
        result.PriceAmount.Should().Be(100.00m);
    }
}