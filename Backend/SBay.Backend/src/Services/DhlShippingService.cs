namespace SBay.Backend.Services;

using System.Diagnostics;

/// <summary>
/// DHL Syria shipping cost calculator
/// Provides shipping rates for Syrian cities
/// </summary>
public sealed class DhlShippingService : IShippingService
{
    // Syrian cities base shipping costs (in SYP)
    private static readonly Dictionary<string, decimal> CityRates = new(StringComparer.OrdinalIgnoreCase)
    {
        // Major cities
        ["Damascus"] = 5000,
        ["دمشق"] = 5000,
        
        ["Aleppo"] = 7000,
        ["حلب"] = 7000,
        
        ["Homs"] = 6000,
        ["حمص"] = 6000,
        
        ["Latakia"] = 8000,
        ["اللاذقية"] = 8000,
        
        ["Hama"] = 6500,
        ["حماة"] = 6500,
        
        ["Tartus"] = 8500,
        ["طرطوس"] = 8500,
        
        ["Deir ez-Zor"] = 9000,
        ["دير الزور"] = 9000,
        
        ["Raqqa"] = 9500,
        ["الرقة"] = 9500,
        
        ["Idlib"] = 7500,
        ["إدلب"] = 7500,
        
        ["Daraa"] = 6500,
        ["درعا"] = 6500,
        
        ["As-Suwayda"] = 6000,
        ["السويداء"] = 6000,
        
        ["Quneitra"] = 7000,
        ["القنيطرة"] = 7000
    };
    
    public Task<ShippingQuote> CalculateShippingAsync(
        string city, 
        decimal totalWeight,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(city))
            throw new ArgumentException("City is required.", nameof(city));
        if (totalWeight < 0)
            throw new ArgumentException("Total weight must be >= 0.", nameof(totalWeight));

        // Normalize city name
        var cityKey = city.Trim();
        
        // Get base cost (default 10000 for unknown cities)
        var baseCost = CityRates.GetValueOrDefault(cityKey, 10000m);
        if (baseCost == 10000m)
            Debug.WriteLine($"Unknown city for shipping rates: {cityKey}");
        
        // Add weight surcharge (1000 SYP per kg over 1kg)
        var weightSurcharge = totalWeight > 1 
            ? (totalWeight - 1) * 1000 
            : 0;
        
        var totalCost = baseCost + weightSurcharge;
        
        // Estimate delivery days based on city
        var estimatedDays = EstimateDeliveryDays(cityKey);
        
        var quote = new ShippingQuote(
            Cost: totalCost,
            Carrier: "DHL Syria",
            EstimatedDays: estimatedDays,
            TrackingNumber: null  // Will be set when shipped
        );
        
        return Task.FromResult(quote);
    }
    
    private static int EstimateDeliveryDays(string city)
    {
        // Damascus: same day or next day
        if (city.Contains("Damascus", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("دمشق"))
            return 1;
        
        // Nearby cities: 2 days
        if (city.Contains("Homs", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("حمص") ||
            city.Contains("Hama", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("حماة"))
            return 2;
        
        // Coastal cities: 3 days
        if (city.Contains("Latakia", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("اللاذقية") ||
            city.Contains("Tartus", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("طرطوس"))
            return 3;
        
        // Northern cities: 3-4 days
        if (city.Contains("Aleppo", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("حلب") ||
            city.Contains("Idlib", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("إدلب"))
            return 3;
        
        // Eastern cities: 4-5 days
        if (city.Contains("Deir", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("دير") ||
            city.Contains("Raqqa", StringComparison.OrdinalIgnoreCase) ||
            city.Contains("الرقة"))
            return 4;
        
        // Default: 3 days
        return 3;
    }
}
