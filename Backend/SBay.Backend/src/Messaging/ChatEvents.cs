using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using SBay.Backend.Services;
using SBay.Domain.Database;
using SBay.Domain.Entities;
using System.Text.Json;

namespace SBay.Backend.Messaging;

public class ChatEvents:IChatEvents
{
    private readonly IHubContext<ChatHub> _hub;
    private readonly IPushNotificationService _push;
    private readonly INotificationRepository _notifications;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ChatEvents> _logger;

    public ChatEvents(
        IHubContext<ChatHub> hub,
        IPushNotificationService push,
        INotificationRepository notifications,
        IUnitOfWork uow,
        ILogger<ChatEvents> logger)
    {
        _hub = hub;
        _push = push;
        _notifications = notifications;
        _uow = uow;
        _logger = logger;
    }

    public async Task MessageNewAsync(Message m, CancellationToken ct)
    {
        var payload = new
        {
            m.Id,
            m.ChatId,
            m.SenderId,
            m.ReceiverId,
            m.Content,
            m.CreatedAt,
            m.IsRead
        };

        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{m.ChatId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.ReceiverId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.SenderId}").SendAsync("message:new", payload, ct),
        };

        await Task.WhenAll(tasks);
        await NotifyReceiverAsync(m, ct);
    }

    private async Task NotifyReceiverAsync(Message m, CancellationToken ct)
    {
        var body = m.Content.Length > 120 ? $"{m.Content[..120]}..." : m.Content;
        var href = $"/chats/thread/{m.ChatId}";
        var data = new { type = "chat", chatId = m.ChatId, listingId = m.ListingId, senderId = m.SenderId, href };

        try
        {
            await _notifications.AddAsync(new UserNotification
            {
                Id = Guid.NewGuid(),
                UserId = m.ReceiverId,
                Type = "chat",
                Title = "New message",
                Body = body,
                Href = href,
                DataJson = JsonSerializer.Serialize(data),
                CreatedAt = DateTimeOffset.UtcNow
            }, ct);
            await _uow.SaveChangesAsync(ct);
            await _hub.Clients.Group($"user:{m.ReceiverId}").SendAsync("notification:new", data, ct);
            await _push.SendAsync(
                m.ReceiverId,
                "New message",
                body,
                data,
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create or send chat notification for message {MessageId}", m.Id);
        }
    }

    public Task MessageUpdatedAsync(Message m, CancellationToken ct)
    {
        var payload = new
        {
            m.Id,
            m.ChatId,
            m.SenderId,
            m.ReceiverId,
            m.Content,
            m.CreatedAt,
            m.IsRead
        };

        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{m.ChatId}").SendAsync("message:updated", payload, ct),
            _hub.Clients.Group($"user:{m.ReceiverId}").SendAsync("message:updated", payload, ct),
            _hub.Clients.Group($"user:{m.SenderId}").SendAsync("message:updated", payload, ct),
        };

        return Task.WhenAll(tasks);
    }

    public Task MessageDeletedAsync(Guid messageId, Guid chatId, Guid senderId, Guid receiverId, bool isRead, CancellationToken ct)
    {
        var payload = new { id = messageId, chatId, senderId, receiverId, isRead };
        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{chatId}").SendAsync("message:deleted", payload, ct),
            _hub.Clients.Group($"user:{receiverId}").SendAsync("message:deleted", payload, ct),
            _hub.Clients.Group($"user:{senderId}").SendAsync("message:deleted", payload, ct),
        };
        return Task.WhenAll(tasks);
    }
    public Task MessagesReadAsync(Guid chatId, Guid readerId, Guid? otherUserId, CancellationToken ct)
    {
        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{chatId}")
                .SendAsync("message:read", new { chatId, readerId }, ct),
            _hub.Clients.Group($"user:{readerId}")
                .SendAsync("message:read", new { chatId, readerId }, ct),
        };

        if (otherUserId.HasValue)
        {
            tasks.Add(
                _hub.Clients.Group($"user:{otherUserId}")
                    .SendAsync("message:read", new { chatId, readerId }, ct)
            );
        }

        return Task.WhenAll(tasks);
    }
}

