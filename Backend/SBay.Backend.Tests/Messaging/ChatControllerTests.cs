using System;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using SBay.Backend.APIs.Records;
using SBay.Backend.APIs.Records.Responses;
using SBay.Backend.Messaging;
using Xunit;

public sealed class ChatsControllerTests : IClassFixture<TestWebAppFactory>
{
    private readonly WebApplicationFactory<Program> _app;

    public ChatsControllerTests(TestWebAppFactory factory)
    {
        _app = factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(svcs =>
            {
                var ownership = new Mock<IUserOwnership>();
                ownership.Setup(x => x.IsOwnerOfListingAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                         .ReturnsAsync((Guid u, Guid l, CancellationToken _) => true);
                svcs.AddScoped<IUserOwnership>(_ => ownership.Object);

                // Replace chat service with in-memory stub for controller flow tests
                svcs.AddSingleton<IChatService, InMemoryChatService>();
            });
        });
    }

    [Fact]
    public async Task Open_Send_History_Flow_Works()
    {
        var client = _app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", FakeJwt.For(Guid.NewGuid()));

        var other = Guid.NewGuid();
        var listing = Guid.NewGuid();

        var open = await client.PostAsJsonAsync("/api/chats/open", new OpenChatRequest(other, listing));
        Assert.Equal(HttpStatusCode.OK, open.StatusCode);
        var opened = await open.Content.ReadFromJsonAsync<OpenChatResponse>();
        Assert.NotNull(opened);

        var send = await client.PostAsJsonAsync($"/api/chats/{opened!.ChatId}/messages", new SendMessageRequest("hello"));
        Assert.Equal(HttpStatusCode.OK, send.StatusCode);

        var inbox = await client.GetFromJsonAsync<Chat[]>("/api/chats?take=10&skip=0");
        Assert.True(inbox!.Any(c => c.Id == opened.ChatId));

        var history = await client.GetFromJsonAsync<Message[]>($"/api/chats/{opened.ChatId}/messages?take=50");
        Assert.Contains(history!, m => m.Content == "hello");
    }
}

sealed class InMemoryChatService : IChatService
{
    private readonly Dictionary<Guid, Chat> _chats = new();
    private readonly List<Message> _messages = new();

    public Task<Chat> OpenOrGetAsync(Guid me, Guid otherUserId, Guid? listingId, IUserOwnership ownership, CancellationToken ct = default)
    {
        return Task.FromResult(OpenInternal(me, otherUserId, listingId));
    }

    private Chat OpenInternal(Guid me, Guid other, Guid? listingId)
    {
        var isSeller = listingId.HasValue; // tests mock ownership to true when listing provided
        var buyerId = isSeller ? other : me;
        var sellerId = isSeller ? me : other;
        var existing = _chats.Values.FirstOrDefault(c => c.BuyerId == buyerId && c.SellerId == sellerId && c.ListingId == listingId);
        if (existing != null) return existing;
        var chat = new Chat { Id = Guid.NewGuid(), BuyerId = buyerId, SellerId = sellerId, ListingId = listingId, CreatedAt = DateTime.UtcNow };
        _chats[chat.Id] = chat;
        return chat;
    }

    public Task<Message> SendAsync(Guid chatId, Guid senderId, string content, CancellationToken ct = default)
    {
        var chat = _chats[chatId];
        var receiverId = senderId == chat.BuyerId ? chat.SellerId : chat.BuyerId;
        var msg = new Message(chatId, content, senderId, receiverId, chat.ListingId);
        _messages.Add(msg);
        chat.LastMessageAt = msg.CreatedAt;
        return Task.FromResult(msg);
    }

    public Task<IReadOnlyList<Message>> GetMessagesAsync(Guid chatId, int take = 50, DateTime? before = null, CancellationToken ct = default)
    {
        var q = _messages.Where(m => m.ChatId == chatId);
        if (before is not null) q = q.Where(m => m.CreatedAt < before);
        return Task.FromResult<IReadOnlyList<Message>>(q.OrderByDescending(m => m.CreatedAt).Take(take).ToList());
    }

    public Task<int> MarkReadAsync(Guid chatId, Guid readerId, DateTime upTo, CancellationToken ct = default)
    {
        var items = _messages.Where(m => m.ChatId == chatId && m.ReceiverId == readerId && !m.IsRead && m.CreatedAt <= upTo).ToList();
        foreach (var m in items) m.IsRead = true;
        return Task.FromResult(items.Count);
    }

    public Task<IReadOnlyList<Chat>> GetInboxAsync(Guid me, int take = 20, int skip = 0, CancellationToken ct = default)
    {
        var items = _chats.Values.Where(c => c.BuyerId == me || c.SellerId == me)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToList();
        return Task.FromResult<IReadOnlyList<Chat>>(items);
    }
}
