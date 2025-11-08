using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public class ChatParticipantHandler: AuthorizationHandler<ChatParticipantRequirement>
{
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;

    public ChatParticipantHandler(ICurrentUserResolver who, IHttpContextAccessor http)
    { _who = who; _http = http; }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, ChatParticipantRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null) return;

        var ct = http.RequestAborted;
        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null) return;

        
        var otherId = http.RouteGuid("otherUserId");
        if (otherId is null)
        {
            var q = http.Request.Query["otherUserId"].ToString();
            if (!Guid.TryParse(q, out var parsed)) return;
            otherId = parsed;
        }


        if (!otherId.HasValue) return;

        // Intended check: authorize only when the caller is not the "other" user
        // Adjust to equality if policy should allow only the other participant.
        if (otherId.Value != me.Value)
        {
            context.Succeed(requirement);
        }
    }
}
