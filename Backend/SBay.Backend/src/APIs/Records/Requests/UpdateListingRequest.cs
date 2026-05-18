namespace SBay.Backend.APIs.Records;

public sealed record UpdateListingRequest
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public decimal? PriceAmount { get; init; }
    public string? PriceCurrency { get; init; }
    public string? CategoryPath { get; init; }
    public string? Region { get; init; }
    public string? SpecificLocation { get; init; }
    public List<string>? ImageUrls { get; init; }
    public int? Stock { get; init; }
    public string? Condition { get; init; }
    public string? Status { get; init; }
}
