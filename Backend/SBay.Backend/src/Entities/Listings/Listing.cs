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

    public void UpdateDetails(string? title, string? description, Money? price, int? stock, ItemCondition? condition, string? categoryPath, string? region)
    {
        if (title != null)
        {
            var trimmedTitle = title.Trim();
            if (string.IsNullOrWhiteSpace(trimmedTitle))
                throw new ArgumentException(nameof(title));
            Title = trimmedTitle;
        }
        if (description != null)
            Description = description.Trim();
        if (price != null)
            Price = price;
        if (stock.HasValue)
        {
            if (stock.Value < 0)
                throw new ArgumentOutOfRangeException(nameof(stock));
            StockQuantity = stock.Value;
        }
        if (condition.HasValue)
            Condition = condition.Value;
        if (categoryPath != null)
            CategoryPath = categoryPath;
        if (region != null)
            Region = region;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ReplaceImages(IEnumerable<string> urls)
    {
        Images.Clear();
        var list = urls?.Where(u => !string.IsNullOrWhiteSpace(u)).ToList() ?? new List<string>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var distinct = new List<string>(list.Count);
        foreach (var url in list)
        {
            var trimmed = url.Trim();
            if (trimmed.Length == 0 || !seen.Add(trimmed)) continue;
            distinct.Add(trimmed);
        }
        for (int i = 0; i < distinct.Count; i++)
        {
            Images.Add(new ListingImage(
                listingId: Id,
                url: distinct[i],
                position: i
            ));
        }

        ThumbnailUrl = distinct.Count > 0 ? distinct[0] : null;
        UpdatedAt = DateTime.UtcNow;
    }
}
