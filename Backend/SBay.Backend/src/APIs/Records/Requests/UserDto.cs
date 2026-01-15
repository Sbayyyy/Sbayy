namespace SBay.Backend.APIs.Records;

public record UserDto(
    Guid Id,
    string Email,
    string? DisplayName,
    string? Phone,
    string? City,
    string? Avatar,
    string Role,
    bool IsSeller,
    DateTime CreatedAt,
    DateTimeOffset? LastTime,
    decimal TotalRevenue,
    int TotalOrders,
    int PendingOrders,
    int ReviewCount,
    decimal Rating,
    bool ListingBanned,
    DateTimeOffset? ListingBanUntil,
    int? ListingLimit,
    int ListingLimitCount,
    DateTimeOffset? ListingLimitResetAt);
