namespace SBay.Backend.DataBase.Queries
{
    public class ListingQuery
    {
        public const int MaxPageSize = 100;

        public string? Text { get; set; }
        public string? Category { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 24;
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? Region { get; set; }

        public void Validate()
        {
            if (Page < 1)
                throw new ArgumentOutOfRangeException(nameof(Page), "Page must be >= 1.");
            if (PageSize < 1 || PageSize > MaxPageSize)
                throw new ArgumentOutOfRangeException(nameof(PageSize), $"PageSize must be between 1 and {MaxPageSize}.");
        }
    }
}
