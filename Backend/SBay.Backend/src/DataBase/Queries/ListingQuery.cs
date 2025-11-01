namespace SBay.Backend.DataBase.Queries
{
    public class ListingQuery
    {
        public string? Text { get; init; }
        public string? Category { get; init; }
        public int Page { get; init; } = 1;
        public int PageSize { get; init; } = 24;
        public decimal? MinPrice { get; init; }
        public decimal? MaxPrice { get; init; }
        public string? Region { get; init; }

        public ListingQuery(
            string? text = null,
            string? category = null,
            int page = 1,
            int pageSize = 24,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            string? region = null
        )
        {
            Text = text;
            Category = category;
            Page = page <= 0 ? 1 : page;
            PageSize = pageSize is < 1 or > 100 ? 24 : pageSize;
            MinPrice = minPrice;
            MaxPrice = maxPrice;
            Region = region;
        }
    }
}
