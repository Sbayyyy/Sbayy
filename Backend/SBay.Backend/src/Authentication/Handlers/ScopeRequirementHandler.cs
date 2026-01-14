using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using SBay.Domain.Authentication.Requirements;
using SBay.Domain.Database;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication.Handlers;

public sealed class ScopeRequirementHandler : AuthorizationHandler<ScopeRequirement>
{
    private const string CachedScopesKey = "SBay:Scopes";

    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ICurrentUserResolver _resolver;
    private readonly IUserRepository _users;
    private readonly ILogger<ScopeRequirementHandler> _logger;

    public ScopeRequirementHandler(
        IHttpContextAccessor httpContextAccessor,
        ICurrentUserResolver resolver,
        IUserRepository users,
        ILogger<ScopeRequirementHandler> logger)
    {
        _httpContextAccessor = httpContextAccessor;
        _resolver = resolver;
        _users = users;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, ScopeRequirement requirement)
    {
        if (context.User?.Identity?.IsAuthenticated != true)
            return;

        var httpContext = _httpContextAccessor.HttpContext ?? context.Resource as HttpContext;
        var scopes = GetScopesFromCache(httpContext) ?? Scopes.ParseClaims(context.User.Claims);

        if (scopes.Count == 0)
        {
            scopes = await ResolveScopesFromUserAsync(context.User, httpContext);
            CacheScopes(httpContext, scopes);
        }

        if (Scopes.HasScope(scopes, requirement.Scope))
            context.Succeed(requirement);
    }

    private static HashSet<string>? GetScopesFromCache(HttpContext? httpContext)
    {
        if (httpContext?.Items.TryGetValue(CachedScopesKey, out var value) == true &&
            value is HashSet<string> cached)
            return cached;

        return null;
    }

    private static void CacheScopes(HttpContext? httpContext, HashSet<string> scopes)
    {
        if (httpContext == null)
            return;

        httpContext.Items[CachedScopesKey] = scopes;
    }

    private async Task<HashSet<string>> ResolveScopesFromUserAsync(ClaimsPrincipal principal, HttpContext? httpContext)
    {
        var role = principal.FindFirst("role")?.Value;
        var isSellerClaim = principal.FindFirst("is_seller")?.Value;
        var isSeller = string.Equals(isSellerClaim, "true", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(role))
        {
            return new HashSet<string>(Scopes.ForRole(role, isSeller), StringComparer.OrdinalIgnoreCase);
        }

        var ct = httpContext?.RequestAborted ?? CancellationToken.None;
        try
        {
            var userId = await _resolver.GetUserIdAsync(principal, ct);
            if (!userId.HasValue || userId.Value == Guid.Empty)
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var user = await _users.GetByIdAsync(userId.Value, ct);
            if (user == null)
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            return new HashSet<string>(Scopes.ForUser(user), StringComparer.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to resolve scopes for authorization.");
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }
}
