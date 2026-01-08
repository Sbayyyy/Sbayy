namespace SBay.Backend.APIs.Records;

/// <summary>
/// Order response DTO with populated address and shipping info
/// </summary>
public sealed record OrderDto(
    Guid Id,
    Guid BuyerId,
    Guid SellerId,
    string Status,
    decimal TotalAmount,
    string TotalCurrency,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<OrderItemDto> Items,
    
    // NEW: E-Commerce fields
    AddressDto? ShippingAddress,
    string PaymentMethod,
    ShippingInfoDto ShippingInfo
);