using Microsoft.AspNetCore.Authorization;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public sealed class SameUserHandler
    : AuthorizationHandler<SameUserRequirement>
{
    private readonly ICurrentUserResolver _who;
    private readonly IHttpContextAccessor _http;

    public SameUserHandler(ICurrentUserResolver who, IHttpContextAccessor http)
    { _who = who; _http = http; }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context, SameUserRequirement requirement)
    {
        var http = _http.HttpContext;
        if (http is null) return;

        var ct = http.RequestAborted;
        var me = await http.GetCurrentUserIdAsync(_who, ct);
        if (me is null) return;

        // Expect route value "userId" (e.g., /users/{userId})
        var userId = http.RouteGuid("userId");
        if (userId is null) return;

        if (userId.Value == me.Value)
            context.Succeed(requirement);
    }
}