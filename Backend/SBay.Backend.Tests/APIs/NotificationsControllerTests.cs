using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using Xunit;

public class NotificationsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public NotificationsControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RegisterPushToken_UpsertsCurrentUsersDeviceToken()
    {
        var client = AuthenticatedClient("users.write");

        var res = await client.PostAsJsonAsync("/api/notifications/push-token", new
        {
            token = "ExponentPushToken[test-token]",
            platform = "android",
            deviceId = "device-1"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        var saved = db.PushTokens.Single(x => x.Token == "ExponentPushToken[test-token]");
        saved.UserId.Should().Be(TestAuthHandler.SellerId);
        saved.Platform.Should().Be("android");
        saved.DeviceId.Should().Be("device-1");
    }

    [Fact]
    public async Task RegisterPushToken_MovesDuplicateTokenToCurrentUser()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            db.PushTokens.Add(new PushToken
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Token = "ExponentPushToken[shared-token]",
                Platform = "ios",
                DeviceId = "old-device",
                CreatedAt = DateTimeOffset.UtcNow.AddDays(-1),
                UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1)
            });
            await db.SaveChangesAsync();
        }

        var client = AuthenticatedClient("users.write");
        var res = await client.PostAsJsonAsync("/api/notifications/push-token", new
        {
            token = "ExponentPushToken[shared-token]",
            platform = "android",
            deviceId = "new-device"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<EfDbContext>();
        var saved = verifyDb.PushTokens.Single(x => x.Token == "ExponentPushToken[shared-token]");
        saved.UserId.Should().Be(TestAuthHandler.SellerId);
        saved.Platform.Should().Be("android");
        saved.DeviceId.Should().Be("new-device");
    }

    [Fact]
    public async Task UnreadCount_CountsOnlyUnreadUnarchivedGeneralNotifications()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            db.UserNotifications.AddRange(
                Notification("Unread", false, false),
                Notification("Read", true, false),
                Notification("Archived", false, true),
                Notification("Other user", false, false, Guid.Parse("22222222-2222-2222-2222-222222222222")));
            await db.SaveChangesAsync();
        }

        var client = AuthenticatedClient("users.read");
        var res = await client.GetAsync("/api/notifications/unread-count");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<UnreadCountResponse>();
        body.Should().NotBeNull();
        body!.Total.Should().Be(1);
    }

    [Fact]
    public async Task MarkRead_MarksOnlyCurrentUsersUnreadUnarchivedNotifications()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
            db.UserNotifications.AddRange(
                Notification("Unread one", false, false),
                Notification("Unread two", false, false),
                Notification("Archived", false, true),
                Notification("Other user", false, false, Guid.Parse("22222222-2222-2222-2222-222222222222")));
            await db.SaveChangesAsync();
        }

        var client = AuthenticatedClient("users.write");
        var res = await client.PostAsync("/api/notifications/mark-read", null);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<MarkedReadResponse>();
        body.Should().NotBeNull();
        body!.Count.Should().Be(2);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<EfDbContext>();
        verifyDb.UserNotifications.Count(x => x.UserId == TestAuthHandler.SellerId && !x.IsRead && !x.IsArchived).Should().Be(0);
        verifyDb.UserNotifications.Count(x => x.UserId != TestAuthHandler.SellerId && !x.IsRead).Should().Be(1);
    }

    private static UserNotification Notification(string title, bool read, bool archived, Guid? userId = null)
    {
        return new UserNotification
        {
            Id = Guid.NewGuid(),
            UserId = userId ?? TestAuthHandler.SellerId,
            Type = "notification",
            Title = title,
            Body = "Body",
            IsRead = read,
            IsArchived = archived,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private HttpClient AuthenticatedClient(string scopes)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", scopes);
        return client;
    }

    private sealed record UnreadCountResponse(int Total);
    private sealed record MarkedReadResponse(int Count);
}
