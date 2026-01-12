namespace SBay.Backend.APIs.Records;

/// <summary>
/// Shipping information DTO (Frontend: ShippingInfo interface)
/// </summary>
public record ShippingInfoDto(
    decimal Cost,
    string Carrier,
    int EstimatedDays,
    string? TrackingNumber
);
