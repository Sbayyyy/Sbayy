using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Messaging;
using SBay.Domain.Database;
using Xunit;

public class ReportsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly TestWebAppFactory _factory;

    public ReportsControllerTests(TestWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Create_MessageReport_ReturnsNotFound_WhenUserIsNotParticipant()
    {
        var sender = Guid.NewGuid();
        var receiver = Guid.NewGuid();
        var chatId = Guid.NewGuid();
        var messageId = Guid.NewGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Add(new Chat { Id = chatId, BuyerId = sender, SellerId = receiver });
        db.Add(new Message
        {
            Id = messageId,
            ChatId = chatId,
            Content = "private",
            SenderId = sender,
            ReceiverId = receiver,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "users.write");

        var res = await client.PostAsJsonAsync("/api/reports", new
        {
            targetType = "Message",
            targetId = messageId,
            reason = "Spam",
            description = "spam",
            evidenceUrls = Array.Empty<string>(),
            blockUser = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await res.Content.ReadAsStringAsync();
        body.Should().NotContain(sender.ToString());
        body.Should().NotContain(receiver.ToString());
    }

    [Fact]
    public async Task Create_MessageReport_AllowsSender_AndReportsReceiver()
    {
        var receiver = Guid.NewGuid();
        var chatId = Guid.NewGuid();
        var messageId = Guid.NewGuid();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EfDbContext>();
        db.Add(new Chat { Id = chatId, BuyerId = TestAuthHandler.SellerId, SellerId = receiver });
        db.Add(new Message
        {
            Id = messageId,
            ChatId = chatId,
            Content = "private",
            SenderId = TestAuthHandler.SellerId,
            ReceiverId = receiver,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName, "ok");
        client.DefaultRequestHeaders.Add("X-Test-Scopes", "users.write");

        var res = await client.PostAsJsonAsync("/api/reports", new
        {
            targetType = "Message",
            targetId = messageId,
            reason = "Spam",
            description = "spam",
            evidenceUrls = Array.Empty<string>(),
            blockUser = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<ReportDto>();
        body.Should().NotBeNull();
        body!.ReportedUserId.Should().BeNull();
        body.TargetId.Should().Be(messageId);

        var saved = db.Reports.Single(r => r.TargetId == messageId);
        saved.ReportedUserId.Should().Be(receiver);
    }
}
