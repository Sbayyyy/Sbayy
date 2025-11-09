namespace SBay.Backend.APIs.Records;

public sealed record OrderDto(Guid Id, Guid BuyerId, Guid SellerId, string Status, decimal TotalAmount, string TotalCurrency, DateTime CreatedAt, DateTime UpdatedAt, IReadOnlyList<OrderItemDto> Items);