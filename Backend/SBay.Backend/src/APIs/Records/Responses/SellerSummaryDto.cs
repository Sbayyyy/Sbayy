namespace SBay.Backend.APIs.Records.Responses;

public sealed record SellerSummaryDto(
    Guid Id,
    string Name,
    string? Avatar,
    decimal Rating,
    int ReviewCount,
    string? City
);
