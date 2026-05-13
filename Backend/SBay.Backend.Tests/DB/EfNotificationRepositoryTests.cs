using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using Xunit;

namespace SBay.Backend.Tests.DB;

public class EfNotificationRepositoryTests
{
    [Fact]
    public async Task MarkAllReadAsync_NonRelationalFallback_PersistsChanges()
    {
        var userId = Guid.NewGuid();
        var options = CreateOptions();

        await using (var db = new EfDbContext(options))
        {
            db.UserNotifications.Add(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Type = "notification",
                Title = "Unread",
                Body = "Body",
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await using (var db = new EfDbContext(options))
        {
            var repo = new EfNotificationRepository(db);
            var count = await repo.MarkAllReadAsync(userId, DateTimeOffset.UtcNow, CancellationToken.None);
            count.Should().Be(1);
        }

        await using (var db = new EfDbContext(options))
        {
            var saved = await db.UserNotifications.SingleAsync(x => x.UserId == userId);
            saved.IsRead.Should().BeTrue();
            saved.ReadAt.Should().NotBeNull();
        }
    }

    [Fact]
    public async Task ArchiveAsync_NonRelationalFallback_PersistsChanges()
    {
        var userId = Guid.NewGuid();
        var notificationId = Guid.NewGuid();
        var options = CreateOptions();

        await using (var db = new EfDbContext(options))
        {
            db.UserNotifications.Add(new UserNotification
            {
                Id = notificationId,
                UserId = userId,
                Type = "notification",
                Title = "Unread",
                Body = "Body",
                CreatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        await using (var db = new EfDbContext(options))
        {
            var repo = new EfNotificationRepository(db);
            await repo.ArchiveAsync(userId, notificationId, CancellationToken.None);
        }

        await using (var db = new EfDbContext(options))
        {
            var saved = await db.UserNotifications.SingleAsync(x => x.Id == notificationId);
            saved.IsArchived.Should().BeTrue();
        }
    }

    private static DbContextOptions<EfDbContext> CreateOptions()
    {
        return new DbContextOptionsBuilder<EfDbContext>()
            .UseInMemoryDatabase($"notifications-{Guid.NewGuid():N}")
            .Options;
    }
}
