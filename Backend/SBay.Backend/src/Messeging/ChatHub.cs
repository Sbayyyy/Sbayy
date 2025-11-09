using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SBay.Backend.Messaging;
[Authorize]
public sealed class ChatHub : Hub
{
    public Task Join(Guid chatId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{chatId}");
    }

    public Task Leave(Guid chatId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat:{chatId}");
    }

    public Task Typing(Guid chatId)
    {
        return Clients.Group($"chat:{chatId}").SendAsync("Typing", new {chatId, userId=Context.UserIdentifier});
    }
}