namespace SBay.Backend.DataBase.Queries
{
    public class ImageQuery
    {
        public Guid? ListingId { get; init; }

        public ImageQuery(
            Guid? listingId = null
        )
        {
            ListingId = listingId;
        }
    }
}