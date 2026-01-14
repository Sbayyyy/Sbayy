namespace SBay.Domain.Authentication;

public static class ScopePolicies
{
    public const string ListingsRead = "Scope:listings.read";
    public const string ListingsWrite = "Scope:listings.write";
    public const string OrdersRead = "Scope:orders.read";
    public const string OrdersWrite = "Scope:orders.write";
    public const string UsersRead = "Scope:users.read";
    public const string UsersWrite = "Scope:users.write";
    public const string UsersManage = "Scope:users.manage";
    public const string MessagesRead = "Scope:messages.read";
    public const string MessagesWrite = "Scope:messages.write";
    public const string AdminAll = "Scope:admin:*";

    public static IEnumerable<string> All => new[]
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
}
