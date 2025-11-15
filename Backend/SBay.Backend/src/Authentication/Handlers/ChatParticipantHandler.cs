using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Entities;
using SBay.Backend.Messaging;
using SBay.Domain.Database;

namespace SBay.Domain.Authentication.Handlers;

public class ChatParticipantHandler: AuthorizationHandler<ChatParticipantRequirement>
{
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;
    private readonly IChatRepository _chats;

    public ChatParticipantHandler(ICurrentUserResolver who, IHttpContextAccessor http, IChatRepository chats)
    { _who = who; _http = http; _chats = chats; }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ChatParticipantRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null) return;

        var ct = http.RequestAborted;
        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null) return;

        // Prefer chatId-based authorization when present (e.g., reading message history)
        var chatId = http.RouteGuid("chatId");
        if (chatId is Guid cid)
        {
            var chat = await _chats.GetByIdAsync(cid, ct);
            if (chat is not null && (chat.BuyerId == me.Value || chat.SellerId == me.Value))
            {
                context.Succeed(requirement);
                return;
            }
            return;
        }

        // Fallback: routes that use otherUserId semantics
        var otherId = http.RouteGuid("otherUserId");
        if (otherId is null)
        {
            var q = http.Request.Query["otherUserId"].ToString();
            if (Guid.TryParse(q, out var parsed)) otherId = parsed;
        }
        if (!otherId.HasValue) return;

        // Authorize when caller differs from the other participant (e.g., starting a chat)
        if (otherId.Value != me.Value)
        {
            context.Succeed(requirement);
        }
    }
}
