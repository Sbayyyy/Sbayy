using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using SBay.Backend.Messaging;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using Xunit;

public sealed class ChatServiceTests
{
    private sealed class TestDbContext : EfDbContext
    {
        public TestDbContext(DbContextOptions<EfDbContext> options) : base(options) { }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Ignore unrelated domain entities from base context
            modelBuilder.Ignore<SBay.Domain.Entities.User>();
            modelBuilder.Ignore<SBay.Domain.Entities.Listing>();
            modelBuilder.Ignore<SBay.Domain.Entities.ShoppingCart>();
            modelBuilder.Ignore<SBay.Domain.Entities.Category>();
            modelBuilder.Ignore<SBay.Domain.Entities.CartItem>();

            // Minimal mapping for messaging entities to work with InMemory provider
            modelBuilder.Entity<Chat>(e =>
            {
                e.HasKey(c => c.Id);
                e.Property(c => c.Id).ValueGeneratedNever();
            });
            modelBuilder.Entity<Message>(e =>
            {
                e.HasKey(m => m.Id);
                e.HasOne(m => m.Chat)
                    .WithMany(c => c.Messages)
                    .HasForeignKey(m => m.ChatId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }

    private static EfDbContext NewDb()
    {
        var opts = new DbContextOptionsBuilder<EfDbContext>()
            .UseInMemoryDatabase($"chat-tests-{Guid.NewGuid()}")
            .EnableSensitiveDataLogging()
            .Options;
        return new TestDbContext(opts);
    }

    private static IUserOwnership Owner(Guid owner)
    {
        var m = new Mock<IUserOwnership>();
        m.Setup(x => x.IsOwnerOfListingAsync(owner, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
         .ReturnsAsync(true);
        m.Setup(x => x.IsOwnerOfListingAsync(It.Is<Guid>(g => g != owner), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
         .ReturnsAsync(false);
        return m.Object;
    }

    private static SBay.Backend.Utils.IClock Clock(DateTime? now = null)
    {
        var m = new Mock<SBay.Backend.Utils.IClock>();
        if (now.HasValue)
            m.SetupGet(x => x.UtcNow).Returns(now.Value);
        else
            m.SetupGet(x => x.UtcNow).Returns(() => DateTime.UtcNow);
        return m.Object;
    }

    private static ITextSanitizer Sanitizer()
    {
        var m = new Mock<ITextSanitizer>();
        m.Setup(x => x.Sanitize(It.IsAny<string>())).Returns<string>(s => s.Trim());
        return m.Object;
    }

    private static IChatEvents Events()
    {
        var m = new Mock<IChatEvents>();
        m.Setup(x => x.MessageNewAsync(It.IsAny<Message>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        m.Setup(x => x.MessagesReadAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<Guid?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        m.Setup(x => x.MessageUpdatedAsync(It.IsAny<Message>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        m.Setup(x => x.MessageDeletedAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<bool>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return m.Object;
    }

    private static ChatService CreateService(EfDbContext db, Guid owner, SBay.Backend.Utils.IClock? clock = null)
    {
        return new ChatService(
            new EfChatRepository(db),
            new EfMessageRepository(db),
            Sanitizer(),
            clock ?? Clock(),
            Owner(owner),
            Events(),
            new EfUnitOfWork(db));
    }

    [Fact]
    public async Task OpenOrGet_ShouldCreate_WhenNotExists_ListingOwnerIsSeller()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var listing = Guid.NewGuid();
        var svc = CreateService(db, me);
        var chat = await svc.OpenOrGetAsync(me, other, listing, default);
        Assert.Equal(me, chat.SellerId);
        Assert.Equal(other, chat.BuyerId);
        Assert.Equal(listing, chat.ListingId);
        Assert.NotEqual(Guid.Empty, chat.Id);
    }

    [Fact]
    public async Task OpenOrGet_ShouldReturnExisting_OnSecondCall()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var listing = Guid.NewGuid();
        var svc = CreateService(db, me);
        var c1 = await svc.OpenOrGetAsync(me, other, listing, default);
        var c2 = await svc.OpenOrGetAsync(me, other, listing, default);
        Assert.Equal(c1.Id, c2.Id);
    }

    [Fact]
    public async Task SendAsync_Persists_Message_AndUpdatesLastMessageAt()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var listing = Guid.NewGuid();
        var svc = CreateService(db, me);
        var chat = await svc.OpenOrGetAsync(me, other, listing, default);
        var dto = await svc.SendAsync(chat.Id, me, "hello", default);
        var saved = await db.Messages.Where(m => m.ChatId == chat.Id).SingleAsync();
        var reloaded = await db.Set<Chat>().SingleAsync(c => c.Id == chat.Id);
        Assert.Equal("hello", saved.Content);
        Assert.False(saved.IsRead);
        Assert.NotNull(reloaded.LastMessageAt);
    }

    [Fact]
    public async Task GetInboxAsync_ReturnsMyChats_OrderedByLastMessageAt()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other1 = Guid.NewGuid();
        var other2 = Guid.NewGuid();
        var svc = CreateService(db, me);
        var c1 = await svc.OpenOrGetAsync(me, other1, null, default);
        await svc.SendAsync(c1.Id, me, "a", default);
        await Task.Delay(5);
        var c2 = await svc.OpenOrGetAsync(me, other2, null, default);
        await svc.SendAsync(c2.Id, me, "b", default);
        var inbox = await svc.GetInboxAsync(me, 10, 0, default);
        Assert.Equal(2, inbox.Count);
        Assert.Equal(c2.Id, inbox[0].Id);
        Assert.Equal(c1.Id, inbox[1].Id);
    }

    [Fact]
    public async Task MarkReadAsync_SetsIsRead_ForReceiver()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var svc = CreateService(db, me);
        var chat = await svc.OpenOrGetAsync(me, other, null, default);
        await svc.SendAsync(chat.Id, me, "m1", default);
        await svc.SendAsync(chat.Id, me, "m2", default);
        var latest = (await svc.GetMessagesAsync(chat.Id, 50, null, default)).First().CreatedAt;
        var n = await svc.MarkReadAsync(chat.Id, other, DateTime.UtcNow, default);
        Assert.True(n >= 2);
        var unread = await db.Messages.CountAsync(m => m.ChatId == chat.Id && m.ReceiverId == other && !m.IsRead);
        Assert.Equal(0, unread);
    }

    [Fact]
    public async Task GetUnreadCountAsync_Returns_TotalUnread_ForUser()
    {
        using var db = NewDb();
        var me = Guid.NewGuid();
        var other = Guid.NewGuid();
        var svc = CreateService(db, me);
        var chat = await svc.OpenOrGetAsync(me, other, null, default);

        await svc.SendAsync(chat.Id, me, "m1", default);
        await svc.SendAsync(chat.Id, me, "m2", default);
        await svc.SendAsync(chat.Id, other, "m3", default);

        var unreadForOther = await svc.GetUnreadCountAsync(other, default);
        var unreadForMe = await svc.GetUnreadCountAsync(me, default);

        Assert.Equal(2, unreadForOther);
        Assert.Equal(1, unreadForMe);
    }
}
