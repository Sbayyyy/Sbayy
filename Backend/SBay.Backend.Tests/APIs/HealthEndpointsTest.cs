using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace SBay.Backend.Tests.APIs;

public class HealthEndpointsTest : IClassFixture<TestWebAppFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointsTest(TestWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    private sealed record HealthDto(string status);

    [Fact]
    public async Task Live_Should_Return_Ok()
    {
        var res = await _client.GetAsync("/health/live");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<HealthDto>();
        body!.status.Should().Be("ok");
    }

    [Fact]
    public async Task Ready_Should_Return_Ok_Or_Unavailable()
    {
        var res = await _client.GetAsync("/health/ready");
        res.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task Adds_Request_And_Trace_Headers()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        req.Headers.TryAddWithoutValidation("X-Request-ID", "testreqid");
        var res = await _client.SendAsync(req);
        res.Headers.TryGetValues("X-Request-ID", out var rids).Should().BeTrue();
        rids!.Should().Contain("testreqid");
        res.Headers.Contains("X-Trace-Id").Should().BeTrue();
    }
}
