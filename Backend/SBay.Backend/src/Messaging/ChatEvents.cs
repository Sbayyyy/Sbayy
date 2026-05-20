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
    private readonly INotificationPreferenceRepository _preferences;
    private readonly IEmailSender _emailSender;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ChatEvents> _logger;

    public ChatEvents(
        IHubContext<ChatHub> hub,
        IPushNotificationService push,
        INotificationRepository notifications,
        INotificationPreferenceRepository preferences,
        IEmailSender emailSender,
        IUserRepository users,
        IUnitOfWork uow,
        ILogger<ChatEvents> logger)
    {
        _hub = hub;
        _push = push;
        _notifications = notifications;
        _preferences = preferences;
        _emailSender = emailSender;
        _users = users;
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
            m.ListingId,
            m.Content,
            m.Type,
            m.DataJson,
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
        if (m.Type != "offer")
        {
            await NotifyReceiverAsync(m, ct);
        }
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

            var preferences = await _preferences.GetOrDefaultAsync(m.ReceiverId, ct);
            if (preferences.PushMessages)
            {
                await _push.SendAsync(
                    m.ReceiverId,
                    "New message",
                    body,
                    data,
                    ct);
            }

            if (preferences.EmailMessages)
            {
                var receiver = await _users.GetByIdAsync(m.ReceiverId, ct);
                if (!string.IsNullOrWhiteSpace(receiver?.Email))
                {
                    await _emailSender.SendEmailAsync(
                        receiver.Email,
                        "New message on SBay",
                        $"<p>You have a new message.</p><p>{System.Net.WebUtility.HtmlEncode(body)}</p>",
                        $"You have a new message.\n\n{body}",
                        ct);
                }
            }
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
            m.ListingId,
            m.Content,
            m.Type,
            m.DataJson,
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
