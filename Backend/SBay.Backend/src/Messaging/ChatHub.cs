using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SBay.Domain.Authentication;

namespace SBay.Backend.Messaging;
[Authorize(Policy = ScopePolicies.MessagesRead)]
public sealed class ChatHub : Hub
{
    private string? GetUserGroup()
    {
        var sub = Context.User?.FindFirstValue("sub") ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? $"user:{id}" : null;
    }

    public override async Task OnConnectedAsync()
    {
        var group = GetUserGroup();
        if (group is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var group = GetUserGroup();
        if (group is not null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
        }
        await base.OnDisconnectedAsync(exception);
    }

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
        return Clients.Group($"chat:{chatId}").SendAsync("Typing", new { chatId, userId = Context.UserIdentifier });
    }
}
