using Microsoft.AspNetCore.SignalR;

namespace SBay.Backend.Messaging;

public class ChatEvents:IChatEvents
{
    private readonly IHubContext<ChatHub> _hub;
    public ChatEvents(IHubContext<ChatHub> hub) => _hub = hub;

    public Task MessageNewAsync(Message m, CancellationToken ct) =>
        _hub.Clients.Group($"chat:{m.ChatId}").SendAsync("message:new", new {
            m.Id, m.ChatId, m.SenderId, m.ReceiverId, m.Content, m.CreatedAt, m.IsRead
        }, ct);

    public Task MessagesReadAsync(Guid chatId, Guid readerId, CancellationToken ct) =>
        _hub.Clients.Group($"chat:{chatId}").SendAsync("message:read", new { chatId, readerId }, ct);
}