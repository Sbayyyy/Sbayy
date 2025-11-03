using System.Security.Claims;
using Microsoft.AspNetCore.Routing;
using SBay.Domain.Entities;

public static class AuthHelpers
{
    public static Guid? RouteGuid(this HttpContext http, string key)
    {
        var v = http.GetRouteValue(key)?.ToString();
        return Guid.TryParse(v, out var g) ? g : (Guid?)null;
    }

    public static async Task<Guid?> GetCurrentUserIdAsync(
        this HttpContext http, ICurrentUserResolver who, CancellationToken ct)
        => await who.GetUserIdAsync(http.User, ct);
}