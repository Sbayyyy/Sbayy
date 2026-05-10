namespace SBay.Backend.APIs.Records.Responses;

public sealed record ChatDto(
    Guid Id,
    Guid BuyerId,
    Guid SellerId,
    Guid? ListingId,
    DateTime CreatedAt,
    DateTime? LastMessageAt,
    bool BuyerArchived,
    bool SellerArchived
);
