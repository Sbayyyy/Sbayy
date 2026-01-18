using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SBay.Domain.Authentication;
using SBay.Domain.Database;

namespace SBay.Backend.Messaging;
[Authorize(Policy = ScopePolicies.MessagesRead)]
public sealed class ChatHub : Hub
{
    private readonly IChatRepository _chats;

    public ChatHub(IChatRepository chats)
    {
        _chats = chats;
    }

    private string? GetUserGroup()
    {
        var sub = Context.User?.FindFirstValue("sub") ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? $"user:{id}" : null;
    }

    private Guid? GetUserId()
    {
        var sub = Context.User?.FindFirstValue("sub") ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private async Task EnsureParticipantAsync(Guid chatId)
    {
        var me = GetUserId();
        if (!me.HasValue)
        {
            throw new HubException("Unauthorized");
        }

        var chat = await _chats.GetByIdAsync(chatId, Context.ConnectionAborted);
        if (chat is null || (chat.BuyerId != me.Value && chat.SellerId != me.Value))
        {
            throw new HubException("Forbidden");
        }
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

    public async Task Join(Guid chatId)
    {
        await EnsureParticipantAsync(chatId);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{chatId}");
    }

    public async Task Leave(Guid chatId)
    {
        await EnsureParticipantAsync(chatId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat:{chatId}");
    }

    public async Task Typing(Guid chatId)
    {
        await EnsureParticipantAsync(chatId);
        await Clients.Group($"chat:{chatId}").SendAsync("Typing", new { chatId, userId = Context.UserIdentifier });
    }
}
