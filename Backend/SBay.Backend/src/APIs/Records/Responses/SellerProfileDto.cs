namespace SBay.Backend.APIs.Records.Responses;

public sealed record SellerProfileDto(
    Guid Id,
    string Name,
    string? Avatar,
    decimal Rating,
    int ReviewCount,
    int TotalOrders,
    string? City,
    DateTime CreatedAt
);
