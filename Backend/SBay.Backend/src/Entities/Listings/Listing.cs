using SBay.Domain.Entities;
using SBay.Domain.ValueObjects;

namespace SBay.Domain.Entities;
 
public class Listing :
    IItem, IPriced, IInventoried, IMediaThumb, ICategorized, IConditioned, ITimestamps
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SellerId { get; private set; }

    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public Money Price { get; private set; }
    public Money? OriginalPrice { get; private set; }

    public int StockQuantity { get; private set; } = 1;
    public string? ThumbnailUrl { get; private set; }  
    public string? CategoryPath { get; private set; }
    public string? Region { get; private set; }

    public ItemCondition Condition { get; private set; } = ItemCondition.Unknown;
    public string Status { get; private set; } = "active";

    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; private set; }

    
    public ICollection<ListingImage> Images { get; private set; } = new List<ListingImage>();

    private Listing() { } 

    public Listing(Guid sellerId, string title, string desc, Money price,
                   int stock = 1, ItemCondition condition = ItemCondition.New,
                   string? thumb = null, string? categoryPath = null,
                   Money? original = null, string? region = null,
                   IEnumerable<ListingImage>? images = null)
    {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException(nameof(title));
        if (stock < 0) throw new ArgumentOutOfRangeException(nameof(stock));

        SellerId = sellerId;
        Title = title.Trim();
        Description = desc ?? string.Empty;
        Price = price;
        OriginalPrice = original;
        StockQuantity = stock;
        Condition = condition;
        ThumbnailUrl = string.IsNullOrWhiteSpace(thumb) ? null : thumb.Trim();
        CategoryPath = categoryPath;
        Region = region;
        CreatedAt = DateTime.UtcNow;

        if (images != null)
            Images = images.OrderBy(i => i.Position).ToList();
    }

    public void SetThumbnail(string? url)
    {
        ThumbnailUrl = string.IsNullOrWhiteSpace(url) ? null : url.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
