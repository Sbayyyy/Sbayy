using System.Security.Claims;
using SBay.Domain.Entities;

namespace SBay.Domain.Authentication;

public static class Scopes
{
    public const string ClaimType = "scope";
    public const string AltClaimType = "scp";
    public const string PermissionsClaimType = "permissions";

    public const string ListingsRead = "listings.read";
    public const string ListingsWrite = "listings.write";
    public const string OrdersRead = "orders.read";
    public const string OrdersWrite = "orders.write";
    public const string UsersRead = "users.read";
    public const string UsersWrite = "users.write";
    public const string UsersManage = "users.manage";
    public const string MessagesRead = "messages.read";
    public const string MessagesWrite = "messages.write";
    public const string AdminAll = "admin:*";

    public static readonly IReadOnlyList<string> All = new[]
    {
        ListingsRead,
        ListingsWrite,
        OrdersRead,
        OrdersWrite,
        UsersRead,
        UsersWrite,
        UsersManage,
        MessagesRead,
        MessagesWrite,
        AdminAll
    };

    public static IReadOnlyCollection<string> ForUser(User user)
    {
        if (user == null) return Array.Empty<string>();
        return ForRole(user.Role, user.IsSeller);
    }

    public static IReadOnlyCollection<string> ForRole(string? role, bool isSeller)
    {
        var normalized = (role ?? "user").Trim().ToLowerInvariant();

        return normalized switch
        {
            "admin" => new[]
            {
                AdminAll
            },
            "support" => new[]
            {
                UsersManage,
                UsersRead,
                OrdersRead,
                MessagesRead,
                ListingsRead
            },
            "seller" => SellerScopes(),
            _ when isSeller => SellerScopes(),
            _ => BuyerScopes()
        };
    }

    public static string ToClaimValue(IEnumerable<string> scopes)
    {
        return string.Join(' ', scopes);
    }

    public static HashSet<string> ParseClaims(IEnumerable<Claim> claims)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var claim in claims)
        {
            if (claim.Type != ClaimType &&
                claim.Type != AltClaimType &&
                claim.Type != PermissionsClaimType)
            {
                continue;
            }

            foreach (var scope in SplitScopes(claim.Value))
            {
                if (!string.IsNullOrWhiteSpace(scope))
                    set.Add(scope.Trim());
            }
        }

        return set;
    }

    public static bool HasScope(IReadOnlyCollection<string> scopes, string required)
    {
        if (scopes == null || scopes.Count == 0 || string.IsNullOrWhiteSpace(required))
            return false;

        foreach (var scope in scopes)
        {
            if (ScopeMatches(scope, required))
                return true;
        }

        return false;
    }

    private static bool ScopeMatches(string granted, string required)
    {
        if (string.Equals(granted, required, StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(granted, AdminAll, StringComparison.OrdinalIgnoreCase))
            return true;

        if (string.Equals(granted, "*", StringComparison.OrdinalIgnoreCase))
            return true;

        if (granted.EndsWith(":*", StringComparison.OrdinalIgnoreCase))
        {
            var prefix = granted[..^2];
            return required.StartsWith(prefix + ":", StringComparison.OrdinalIgnoreCase)
                   || string.Equals(required, prefix, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    private static IEnumerable<string> SplitScopes(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return Array.Empty<string>();

        return value.Split(new[] { ' ', ',' }, StringSplitOptions.RemoveEmptyEntries);
    }

    private static string[] BuyerScopes()
    {
        return new[]
        {
            ListingsRead,
            OrdersRead,
            OrdersWrite,
            UsersRead,
            UsersWrite,
            MessagesRead,
            MessagesWrite
        };
    }

    private static string[] SellerScopes()
    {
        return new[]
        {
            ListingsRead,
            ListingsWrite,
            OrdersRead,
            OrdersWrite,
            UsersRead,
            UsersWrite,
            MessagesRead,
            MessagesWrite
        };
    }
}
