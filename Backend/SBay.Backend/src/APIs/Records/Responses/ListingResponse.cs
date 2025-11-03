public record ListingResponse
{
    public Guid Id { get; init; }
    public decimal PriceAmount { get; init; }
    public int Stock { get; init; }
    public ItemCondition Condition { get; init; }
    public string? CategoryPath { get; init; }
    public string? Region { get; init; }
    public DateTime CreatedAt { get; init; }
    public string Title { get; init; } = default!;
    public string Description { get; init; } = default!;
    public string PriceCurrency { get; init; } = default!;
}