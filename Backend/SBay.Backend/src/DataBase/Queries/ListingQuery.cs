namespace SBay.Backend.DataBase.Queries
{
    public class ListingQuery
    {
        public const int MaxPageSize = 100;
        public const int MaxTextLength = 200;
        public const int MaxCategoryLength = 200;
        public const int MaxRegionLength = 100;

        public string? Text { get; set; }
        public string? Category { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 24;
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? Region { get; set; }
        public string? Condition { get; set; }

        public void Validate()
        {
            if (Page < 1)
                throw new ArgumentOutOfRangeException(nameof(Page), "Page must be >= 1.");
            if (PageSize < 1 || PageSize > MaxPageSize)
                throw new ArgumentOutOfRangeException(nameof(PageSize), $"PageSize must be between 1 and {MaxPageSize}.");
            if (MinPrice.HasValue && MinPrice.Value < 0)
                throw new ArgumentOutOfRangeException(nameof(MinPrice), "MinPrice must be >= 0.");
            if (MaxPrice.HasValue && MaxPrice.Value < 0)
                throw new ArgumentOutOfRangeException(nameof(MaxPrice), "MaxPrice must be >= 0.");
            if (MinPrice.HasValue && MaxPrice.HasValue && MinPrice.Value > MaxPrice.Value)
                throw new ArgumentException("MinPrice must be <= MaxPrice.", nameof(MinPrice));
            if (Text != null && Text.Length > MaxTextLength)
                throw new ArgumentException($"Text length must be <= {MaxTextLength}.", nameof(Text));
            if (Category != null && Category.Length > MaxCategoryLength)
                throw new ArgumentException($"Category length must be <= {MaxCategoryLength}.", nameof(Category));
            if (Region != null && Region.Length > MaxRegionLength)
                throw new ArgumentException($"Region length must be <= {MaxRegionLength}.", nameof(Region));
            if (!string.IsNullOrWhiteSpace(Condition))
            {
                var parsed = ItemConditionExtensions.FromString(Condition);
                if (parsed == ItemCondition.Unknown && !string.Equals(Condition.Trim(), "unknown", StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException("Condition must be one of: New, Used, LikeNew, Refurbished, ForParts, Damaged, Unknown.", nameof(Condition));
            }
        }
    }
}
