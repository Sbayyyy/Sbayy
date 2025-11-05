namespace SBay.Backend.APIs.Records.Responses
{

    public sealed record ListingResponse
    {
        public Guid Id { get; init; }

        public decimal PriceAmount { get; init; }
        public required string PriceCurrency { get; init; }

        public int Stock { get; init; }
        public ItemCondition Condition { get; init; }

        public string? CategoryPath { get; init; }
        public string? Region { get; init; }

        public DateTimeOffset CreatedAt { get; init; }

        public required string Title { get; init; }
        public required string Description { get; init; }

        public string? ThumbnailUrl { get; init; }
        public IReadOnlyList<ListingImageDto> Images { get; init; } = Array.Empty<ListingImageDto>();

        public List<string> ImageUrls => Images.Select(i => i.Url).ToList();
    }
}