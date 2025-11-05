namespace SBay.Backend.APIs.Records;

public sealed record AddListingRequest
{
    public required string Title { get; init; }
    public required string Description { get; init; }

    public decimal PriceAmount { get; init; }
    public string PriceCurrency { get; init; } = "SYP";

    public string? CategoryPath { get; init; }
    public string? Region { get; init; }

    public List<string> ImageUrls { get; init; } = new();

    public int Stock { get; init; } = 1;
    public string Condition { get; init; } = "Unknown";
}