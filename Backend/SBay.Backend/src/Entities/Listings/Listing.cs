

namespace SBay.Domain.Entities
{

    public class Listing :
     IItem, IPriced, IInventoried, IMediaThumb, ICategorized, IConditioned, ITimestamps
    {
        public Guid Id { get; private set; } = Guid.NewGuid();
        public Guid SellerId { get; private set; }

        public string Title { get; private set; } = "";
        public string Description { get; private set; } = "";

        public ValueObjects.Money Price { get; private set; }
        public ValueObjects.Money? OriginalPrice { get; private set; }

        public int StockQuantity { get; private set; }
        public string? ThumbnailUrl { get; private set; }
        public string? CategoryPath { get; private set; }
        public ItemCondition Condition { get; private set; } = ItemCondition.Unknown;

        public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; private set; }
        public string Region{get; private set;} = "";

        private Listing() { } // EF/serializer

        public Listing(Guid sellerId, string title, string desc, ValueObjects.Money price,
                       int stock = 0, ItemCondition condition = ItemCondition.New,
                       string? thumb = null, string? categoryPath = null,
                       ValueObjects.Money? original = null, string? region = null)
        {
            if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException(nameof(title));
            if (stock < 0) throw new ArgumentOutOfRangeException(nameof(stock));

            SellerId = sellerId;
            Title = title;
            Description = desc ?? "";
            Price = price;
            OriginalPrice = original;
            StockQuantity = stock;
            Condition = condition;
            ThumbnailUrl = thumb;
            CategoryPath = categoryPath;
            Region= region;
            UpdatedAt = DateTime.UtcNow;
            CreatedAt = DateTime.UtcNow;
            
        }

        // Domain methods (enforce invariants)
        public void ChangePrice(ValueObjects.Money newPrice, ValueObjects.Money? was = null)
        {
            Price = newPrice;
            OriginalPrice = was;
            UpdatedAt = DateTime.UtcNow;
        }

        public void AdjustStock(int delta)
        {
            var next = StockQuantity + delta;
            if (next < 0) throw new InvalidOperationException("Insufficient stock.");
            StockQuantity = next;
            UpdatedAt = DateTime.UtcNow;
        }
    }

}
