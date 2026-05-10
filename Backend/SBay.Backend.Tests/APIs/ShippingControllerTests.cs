using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

public class ShippingControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public ShippingControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Calculate_ReturnsQuote_ForCity()
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/api/shipping/calculate", new { city = "Damascus" });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<ShippingQuoteResponse>();
        body.Should().NotBeNull();
        body!.Cost.Should().BeGreaterThan(0);
        body.Carrier.Should().Be("dhl");
        body.EstimatedDays.Should().BeGreaterThan(0);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task Calculate_RejectsInvalidWeight(decimal weightKg)
    {
        var client = _factory.CreateClient();

        var res = await client.PostAsJsonAsync("/api/shipping/calculate", new { city = "Damascus", weightKg });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private sealed record ShippingQuoteResponse(decimal Cost, string Carrier, int EstimatedDays, string? TrackingNumber);
}
