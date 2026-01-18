using Microsoft.AspNetCore.SignalR;

namespace SBay.Backend.Messaging;

public class ChatEvents:IChatEvents
{
    private readonly IHubContext<ChatHub> _hub;
    public ChatEvents(IHubContext<ChatHub> hub) => _hub = hub;

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

        var tasks = new List<Task>
        {
            _hub.Clients.Group($"chat:{m.ChatId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.ReceiverId}").SendAsync("message:new", payload, ct),
            _hub.Clients.Group($"user:{m.SenderId}").SendAsync("message:new", payload, ct),
        };

        return Task.WhenAll(tasks);
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
