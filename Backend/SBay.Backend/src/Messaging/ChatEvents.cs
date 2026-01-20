using Microsoft.AspNetCore.SignalR;

namespace SBay.Backend.Messaging;

public class ChatEvents:IChatEvents
{
    private readonly IHubContext<ChatHub> _hub;
    private readonly IPushNotificationService _push;
    public ChatEvents(IHubContext<ChatHub> hub, IPushNotificationService push)
    {
        _hub = hub;
        _push = push;
    }

    public Task MessageNewAsync(Message m, CancellationToken ct)
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

        _ = SafePushAsync(m, ct);

        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{m.ChatId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.ReceiverId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.SenderId}").SendAsync("message:new", payload, ct),
        };

        return Task.WhenAll(tasks);
    }

    private async Task SafePushAsync(Message m, CancellationToken ct)
    {
        try
        {
            await _push.SendAsync(
                m.ReceiverId,
                "New message",
                m.Content.Length > 120 ? $"{m.Content[..120]}..." : m.Content,
                new { chatId = m.ChatId, senderId = m.SenderId },
                ct);
        }
        catch
        {
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
