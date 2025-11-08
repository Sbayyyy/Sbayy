namespace SBay.Backend.APIs.Records;

public sealed record OrderItemDto(Guid Id, Guid ListingId, int Quantity, decimal PriceAmount, string PriceCurrency);