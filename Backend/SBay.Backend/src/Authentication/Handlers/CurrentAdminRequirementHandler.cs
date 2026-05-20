using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public sealed class CurrentAdminRequirement : IAuthorizationRequirement
{
}

public sealed class CurrentAdminRequirementHandler : AuthorizationHandler<CurrentAdminRequirement>
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUserRepository _users;

    public CurrentAdminRequirementHandler(
        IHttpContextAccessor httpContextAccessor,
        ICurrentUserResolver resolver,
        IUserRepository users)
    {
        _httpContextAccessor = httpContextAccessor;
        _resolver = resolver;
        _users = users;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, CurrentAdminRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
            return;

        var ct = _httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;
        var userId = await _resolver.GetUserIdAsync(context.User, ct);
        if (!userId.HasValue || userId.Value == Guid.Empty)
            return;

        var user = await _users.GetByIdAsync(userId.Value, ct);
        if (user is { Status: "active", Role: "admin" })
            context.Succeed(requirement);
    }
}
