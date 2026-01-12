namespace SBay.Backend.Services;

/// <summary>
/// Service for calculating shipping costs and delivery times
/// </summary>
public interface IShippingService
{
    /// <summary>
    /// Calculate shipping cost based on destination city
    /// </summary>
    /// <param name="city">Syrian city (e.g., "Damascus", "Aleppo")</param>
    /// <param name="totalWeight">Total weight in kg (optional, for future)</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Shipping quote with cost, carrier, and estimated days</returns>
    Task<ShippingQuote> CalculateShippingAsync(
        string city, 
        decimal totalWeight,
        CancellationToken ct = default);
}

/// <summary>
/// Shipping quote result (matches Frontend: ShippingInfo)
/// </summary>
public record ShippingQuote(
    decimal Cost,
    string Carrier,
    int EstimatedDays,
    string? TrackingNumber
);
