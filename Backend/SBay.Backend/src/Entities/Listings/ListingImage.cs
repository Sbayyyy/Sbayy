namespace SBay.Domain.Entities
{
    public class ListingImage
    {
        public Guid Id { get; private set; }
        public Guid ListingId { get; private set; }

        public string Url { get; private set; } = null!;
        public int Position { get; private set; }

        public string? MimeType { get; private set; }
        public int? Width { get; private set; }
        public int? Height { get; private set; }

        public Listing Listing { get; private set; } = default!;

        private ListingImage() { }

        public ListingImage(Guid listingId, string url, int position = 0,
            string? mimeType = null, int? width = null, int? height = null)
        {
            if (string.IsNullOrWhiteSpace(url))
                throw new ArgumentException("Image URL cannot be empty.", nameof(url));

            ListingId = listingId;
            Url       = url.Trim();
            Position  = position;
            MimeType  = mimeType;
            Width     = width;
            Height    = height;
        }

        public void UpdateMetadata(string? mimeType, int? width, int? height)
        {
            MimeType = mimeType;
            Width    = width;
            Height   = height;
        }
    }
}