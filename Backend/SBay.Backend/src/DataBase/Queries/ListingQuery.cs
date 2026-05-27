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
        public bool Featured { get; set; }

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

            ValidateCsv(Category, MaxCategoryLength, nameof(Category));
            ValidateCsv(Region, MaxRegionLength, nameof(Region));

            if (!string.IsNullOrWhiteSpace(Condition))
            {
                foreach (var part in Condition.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    var parsed = ItemConditionExtensions.FromString(part);
                    if (parsed == ItemCondition.Unknown && !string.Equals(part, "unknown", StringComparison.OrdinalIgnoreCase))
                        throw new ArgumentException($"Condition value '{part}' is invalid. Allowed: New, Used, LikeNew, Refurbished, ForParts, Damaged, Unknown.", nameof(Condition));
                }
            }
        }

        private static void ValidateCsv(string? value, int maxLengthPerValue, string paramName)
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            foreach (var part in value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (part.Length > maxLengthPerValue)
                    throw new ArgumentException($"{paramName} value length must be <= {maxLengthPerValue}.", paramName);
            }
        }
    }
}
