namespace SBay.Backend.APIs.Records;

public sealed record CreateOrderItemReq(Guid ListingId, int Quantity, decimal PriceAmount, string PriceCurrency);