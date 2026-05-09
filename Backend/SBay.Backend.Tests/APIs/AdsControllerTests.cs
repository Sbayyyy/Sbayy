using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.Api.Controllers;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using Xunit;

public class AdsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public AdsControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Create_ReturnsForbidden_ForNonAdmin()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");

        var res = await client.PostAsJsonAsync("/api/ads", new
        {
            title = "Sponsored",
            description = "desc",
            imageUrl = "/uploads/ad.png",
            ctaText = "Learn more",
            targetUrl = "/browse",
            isActive = true,
            startsAt = DateTime.UtcNow.AddMinutes(-1),
            endsAt = DateTime.UtcNow.AddDays(1),
            priority = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetActive_ExcludesInactiveExpiredAndArchivedAds()
    {
        var visible = new SponsoredAd
        {
            Title = $"Visible {Guid.NewGuid():N}",
            Description = "desc",
            TargetUrl = "/browse",
            CtaText = "Learn more",
            IsActive = true,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            EndsAt = DateTime.UtcNow.AddDays(1),
            Priority = 20
        };
        var inactive = new SponsoredAd
        {
            Title = $"Inactive {Guid.NewGuid():N}",
            Description = "desc",
            TargetUrl = "/browse",
            CtaText = "Learn more",
            IsActive = false,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            EndsAt = DateTime.UtcNow.AddDays(1)
        };
        var expired = new SponsoredAd
        {
            Title = $"Expired {Guid.NewGuid():N}",
            Description = "desc",
            TargetUrl = "/browse",
            CtaText = "Learn more",
            IsActive = true,
            StartsAt = DateTime.UtcNow.AddDays(-2),
            EndsAt = DateTime.UtcNow.AddDays(-1)
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.SponsoredAds.AddRange(visible, inactive, expired);
        await db.SaveChangesAsync();

        var res = await _factory.CreateClient().GetAsync("/api/ads");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var ads = await res.Content.ReadFromJsonAsync<List<SponsoredAdDto>>();
        ads.Should().NotBeNull();
        ads!.Select(a => a.Id).Should().Contain(visible.Id);
        ads.Select(a => a.Id).Should().NotContain(inactive.Id);
        ads.Select(a => a.Id).Should().NotContain(expired.Id);
        ads.Single(a => a.Id == visible.Id).Type.Should().Be("ad");
    }

    [Fact]
    public async Task Click_TracksOnlyCurrentlyActiveAds()
    {
        var active = new SponsoredAd
        {
            Title = $"Track {Guid.NewGuid():N}",
            Description = "desc",
            TargetUrl = "/browse",
            CtaText = "Learn more",
            IsActive = true,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            EndsAt = DateTime.UtcNow.AddDays(1)
        };
        var inactive = new SponsoredAd
        {
            Title = $"NoTrack {Guid.NewGuid():N}",
            Description = "desc",
            TargetUrl = "/browse",
            CtaText = "Learn more",
            IsActive = false,
            StartsAt = DateTime.UtcNow.AddMinutes(-5),
            EndsAt = DateTime.UtcNow.AddDays(1)
        };

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.SponsoredAds.AddRange(active, inactive);
        await db.SaveChangesAsync();

        var client = _factory.CreateClient();
        var activeRes = await client.PostAsync($"/api/ads/{active.Id}/click", null);
        var inactiveRes = await client.PostAsync($"/api/ads/{inactive.Id}/click", null);

        activeRes.StatusCode.Should().Be(HttpStatusCode.NoContent);
        inactiveRes.StatusCode.Should().Be(HttpStatusCode.NoContent);
        db.ChangeTracker.Clear();
        db.SponsoredAds.Single(a => a.Id == active.Id).Clicks.Should().Be(1);
        db.SponsoredAds.Single(a => a.Id == inactive.Id).Clicks.Should().Be(0);
    }
}
