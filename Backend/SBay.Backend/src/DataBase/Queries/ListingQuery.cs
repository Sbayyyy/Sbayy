namespace SBay.Backend.DataBase.Queries
{
    public class ListingQuery
    {
        public string? Text { get; set; }
        public string? Category { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 24;
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string? Region { get; set; }
    }
}
